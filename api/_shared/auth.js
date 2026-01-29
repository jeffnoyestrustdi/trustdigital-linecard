function getUserEmail(req) {
  // SWA injects identity in headers; easiest reliable source is x-ms-client-principal
  const headers = (req && req.headers) || {};
  const encoded = headers["x-ms-client-principal"] || headers["X-MS-Client-Principal"];
  if (!encoded) return null;

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const principal = JSON.parse(decoded);

    // claims often include emails; tolerate different claim key names
    const claims = principal?.claims || [];
    const findClaim = (key) => claims.find(c => c.typ === key || c.type === key)?.val;

    const emailClaim =
      findClaim("emails") ||
      findClaim("email") ||
      findClaim("preferred_username") ||
      principal?.userDetails;

    return (emailClaim || "").toLowerCase();
  } catch (e) {
    console.error("getUserEmail: failed to parse x-ms-client-principal:", e);
    return null;
  }
}

function isAdmin(req) {
  // 1) If ADMIN_EMAILS env var lists the user, allow.
  const email = getUserEmail(req);
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  if (email && allow.includes(email)) return true;

  // 2) If the principal includes a userRoles array and it contains 'admin', allow.
  try {
    const headers = (req && req.headers) || {};
    const encoded = headers["x-ms-client-principal"] || headers["X-MS-Client-Principal"];
    if (encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const principal = JSON.parse(decoded);
      if (Array.isArray(principal?.userRoles) && principal.userRoles.includes("admin")) {
        return true;
      }
    }
  } catch (e) {
    // ignore parse errors, fallthrough to false, but log for diagnostics
    console.error("isAdmin: failed to parse principal for roles check:", e);
  }

  return false;
}

module.exports = { getUserEmail, isAdmin };