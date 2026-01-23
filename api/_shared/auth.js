function getUserEmail(req) {
  // SWA injects identity in headers; easiest reliable source is x-ms-client-principal
  const encoded = req.headers["x-ms-client-principal"];
  if (!encoded) return null;

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const principal = JSON.parse(decoded);

  // claims often include emails
  const emailClaim =
    principal?.claims?.find(c => c.typ === "emails")?.val ||
    principal?.claims?.find(c => c.typ === "preferred_username")?.val ||
    principal?.userDetails;

  return (emailClaim || "").toLowerCase();
}

function isAdmin(req) {
  const email = getUserEmail(req);
  if (!email) return false;

  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  return allow.includes(email);
}

module.exports = { getUserEmail, isAdmin };
