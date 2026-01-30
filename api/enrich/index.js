// --- replace the parsing section after getting `content` from the model ---
// `content` is data?.choices?.[0]?.message?.content

let jsonText = content ? content.trim() : "";

context.log("enrich: raw model content preview:", jsonText.substring(0, 400));

// strip fenced code blocks like ```json ... ```
jsonText = jsonText.replace(/^\s*```(?:json)?\s*/, "").replace(/\s*```\s*$/, "");

// helper: try parse multiple ways (entire text, then first {...}, then first [...])
function tryParseJsonFromText(text) {
  if (!text || typeof text !== "string") return null;
  // quick attempt: whole text
  try { return JSON.parse(text); } catch (e) {}

  // attempt to find first {...} block
  const firstCurly = text.indexOf("{");
  const lastCurly = text.lastIndexOf("}");
  if (firstCurly !== -1 && lastCurly > firstCurly) {
    const candidate = text.substring(firstCurly, lastCurly + 1);
    try { return JSON.parse(candidate); } catch (e) {}
  }

  // attempt to find first [...] block
  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const candidate = text.substring(firstBracket, lastBracket + 1);
    try { return JSON.parse(candidate); } catch (e) {}
  }

  // no JSON found
  return null;
}

let parsed = tryParseJsonFromText(jsonText);

if (!parsed) {
  context.log("enrich: initial parse failed. Attempting safe extractor retry...");

  // Build a short follow-up instruction to return only JSON extracted from the previous reply.
  // Note: we use a second call to the same deployment to ask for JSON-only extraction.
  const retrySystem = `You are a strict JSON extractor. Given the previous model output (the user message),
  return ONLY valid JSON (no explanation, no markdown). If there is no JSON, return an empty JSON object {}.`;

  const retryUser = `Extract valid JSON from the following text. Output ONLY JSON (no surrounding text or markdown):\n\n${jsonText}`;

  const retryBody = {
    messages: [
      { role: "system", content: retrySystem },
      { role: "user", content: retryUser }
    ],
    temperature: 0.0,
    max_tokens: 800
  };

  try {
    const retryResp = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json", "api-key": key }, body: JSON.stringify(retryBody) });
    if (retryResp.ok) {
      const retryData = await retryResp.json();
      const retryContent = retryData?.choices?.[0]?.message?.content || "";
      let cleaned = retryContent.trim().replace(/^\s*```(?:json)?\s*/, "").replace(/\s*```\s*$/, "");
      // log small preview
      context.log("enrich: retry content preview:", cleaned.substring(0, 400));
      parsed = tryParseJsonFromText(cleaned);
      if (!parsed) {
        context.log("enrich: retry parse still failed - cleaned content:", cleaned.substring(0, 800));
      }
    } else {
      const txt = await retryResp.text();
      context.log("enrich: retry OpenAI error:", retryResp.status, txt);
    }
  } catch (retryErr) {
    context.log("enrich: retry request threw:", retryErr);
  }
}

if (!parsed) {
  // Final failure: include the raw content (shortened) in the response for debugging.
  // DO NOT include sensitive keys - we only include the model content.
  const rawPreview = (jsonText && jsonText.length > 2000) ? jsonText.substring(0, 2000) + "...(truncated)" : jsonText;
  context.log("enrich: UNABLE_TO_PARSE_JSON: raw model output (truncated):", rawPreview);
  context.res = { status: 502, body: { error: "OpenAI returned unparsable JSON", raw: rawPreview } };
  return;
}

// At this point `parsed` is the JSON object we will use
// ... continue with existing code that uses `parsed` ...