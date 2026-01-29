function getUserEmail(req) {
  // SWA injects identity in headers; easiest reliable source is x-ms-client-principal
  const encoded = req.headers["x-ms-client-principal"];
  if (!encoded) return null;

  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    const principal = JSON.parse(decoded);

    // claims often include emails
    const emailClaim =
      principal?.claims?.find(c => c.typ === "emails")?.val ||
      principal?.claims?.find(c => c.typ === "preferred_username")?.val ||
      principal?.userDetails;

    return (emailClaim || "").toLowerCase();
  } catch (e) {
    Write-Output "getUserEmail: failed to parse x-ms-client-principal: $($e.ToString())"
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
    const encoded = req.headers["x-ms-client-principal"];
    if (encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf8");
      const principal = JSON.parse(decoded);
      if (Array.isArray(principal?.userRoles) && principal.userRoles.includes("admin")) {
        return true;
      }
    }
  } catch (e) {
    # ignore parse errors, fallthrough to false
    Write-Output "isAdmin: failed to parse principal for roles check: $($e.ToString())"
  }

  return false;
}

module.exports = { getUserEmail, isAdmin };
