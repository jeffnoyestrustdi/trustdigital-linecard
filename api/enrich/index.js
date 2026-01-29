const fetch = require("node-fetch");

function isLikelyHttps(u) {
  try { const p = new URL(u); return p.protocol === "https:"; } catch (e) { return false; }
}

module.exports = async function (context, req) {
  try {
    const name = (req.query.name || (req.body && req.body.name) || "").trim();
    if (!name) { context.res = { status: 400, body: { error: "Missing 'name' parameter" } }; return; }

    // Dev mock support
    if ((process.env.USE_MOCK_ENRICH || "").toLowerCase() === "true") {
      context.res = { status: 200, body: {
        website: "https://example-manufacturer.test",
        domain: "example-manufacturer.test",
        logo: "https://via.placeholder.com/128?text=Logo",
        description: "Example Manufacturer supplies widgets and services for testing.",
        topProducts: [ { name: "Widget A", url: null, description: "A popular widget." }, { name: "Service B", url: null, description: "Managed service offering." } ],
        categories: ["Security","Networking"],
        tags: ["example","test","widgets"],
        confidence: 0.85,
        sources: [],
        notes: "Mock data for local development"
      } };
      return;
    }

    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const key = process.env.AZURE_OPENAI_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    if (!endpoint || !key || !deployment) { context.res = { status: 500, body: { error: "OpenAI configuration missing" } }; return; }

    const systemPrompt = `
You are a factual assistant. Given only a manufacturer's name, return a JSON object (no other text)
with keys: website, domain, logo, description, topProducts, categories, tags, confidence, sources, notes.

Rules:
- Respond only with valid JSON.
- website: the official website URL if known, otherwise null.
- domain: the root domain (example.com) if known, otherwise null.
- logo: a URL to the company logo if you can provide one confidently; otherwise null.
- topProducts: an array of objects {name, url, description?} for 0..5 well-known products. If you are not sure of a product's official URL, set url to null.
- categories: array of 0..5 short category names.
- tags: array of keywords.
- confidence: a number 0.0 - 1.0 indicating how confident you are in the data.
- sources: an array of URLs you used (if any). If none, leave it empty.
- notes: short string explaining uncertainty or caveats.

Crucial: Do NOT invent websites, domains, product URLs or logo URLs. If you do not know a website or URL, return null for that field and set confidence low. Output must be parseable JSON only.
`;

    const userPrompt = `Enrich the manufacturer: "${name}"`;

    const apiUrl = `${endpoint.replace(/\/$/, "")}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=2023-05-15`;
    const body = { messages: [ { role: "system", content: systemPrompt }, { role: "user", content: userPrompt } ], temperature: 0.2, max_tokens: 800 };

    const resp = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/json", "api-key": key }, body: JSON.stringify(body) });
    if (!resp.ok) { const txt = await resp.text(); context.log("OpenAI error:", resp.status, txt); context.res = { status: 502, body: { error: "OpenAI error", detail: txt } }; return; }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) { context.res = { status: 502, body: { error: "OpenAI returned no content" } }; return; }

    let jsonText = content.trim();
    jsonText = jsonText.replace(/^\s*```(?:json)?\s*/, "").replace(/\s*```\s*$/, "");

    let parsed;
    try { parsed = JSON.parse(jsonText); } catch (e) { context.log("Failed to parse JSON from model:", e, jsonText); context.res = { status: 502, body: { error: "OpenAI returned unparsable JSON", raw: jsonText } }; return; }

    const enableClearbit = (process.env.ENABLE_CLEARBIT_LOGO || "").toLowerCase() === "true";
    if (!parsed.logo && parsed.domain && enableClearbit) {
      const cdomain = parsed.domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
      parsed.logo = `https://logo.clearbit.com/${cdomain}`;
    }

    if (parsed.website && !isLikelyHttps(parsed.website)) parsed.website = parsed.website.startsWith("http") ? parsed.website : `https://${parsed.website}`;

    context.res = { status: 200, body: parsed };
  } catch (err) { context.log("enrich: UNHANDLED", err); context.res = { status: 500, body: { error: String(err) } }; }
};
