const { BlobServiceClient } = require("@azure/storage-blob");
const { isAdmin } = require("../_shared/auth");

function getAccountNameFromConnectionString(conn) { const m = conn.match(/AccountName=([^;]+)/i); return m ? m[1] : null; }
function sanitizeName(name) { return name.replace(/[^a-z0-9-_.]/gi, "-").toLowerCase(); }
function contentTypeFromFilename(filename) { const ext = (filename || "").split(".").pop().toLowerCase(); switch (ext) { case "jpg": case "jpeg": return "image/jpeg"; case "png": return "image/png"; case "webp": return "image/webp"; case "gif": return "image/gif"; case "svg": return "image/svg+xml"; default: return "application/octet-stream"; } }

module.exports = async function (context, req) {
  try {
    if (!isAdmin(req)) { context.res = { status: 403, body: { error: "Forbidden" } }; return; }

    const body = req.body || {};
    const filename = (body.filename || "").trim();
    const b64 = body.data || "";
    if (!filename || !b64) { context.res = { status: 400, body: { error: "Missing filename or data (base64)" } }; return; }

    const conn = process.env.LINECARD_STORAGE_CONN;
    if (!conn) { context.res = { status: 500, body: { error: "LINECARD_STORAGE_CONN not configured" } }; return; }

    const blobServiceClient = BlobServiceClient.fromConnectionString(conn);
    const containerName = (process.env.LOGOS_CONTAINER || "logos").toLowerCase();
    const containerClient = blobServiceClient.getContainerClient(containerName);

    try { await containerClient.createIfNotExists({ access: "container" }); } catch (e) { context.log("container createIfNotExists:", e.message || e); }

    const ts = Date.now();
    const base = sanitizeName(filename.replace(/\.[^.]+$/, ""));
    const ext = filename.split(".").pop();
    const blobName = `${base}-${ts}.${ext}`;

    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const buffer = Buffer.from(b64, "base64");
    const contentType = contentTypeFromFilename(filename);

    if (buffer.length > 2 * 1024 * 1024) { context.res = { status: 400, body: { error: "File too large (max 2MB)" } }; return; }

    await blockBlobClient.uploadData(buffer, { blobHTTPHeaders: { blobContentType: contentType } });

    const account = getAccountNameFromConnectionString(conn);
    let url; if (account) { url = `https://${account}.blob.core.windows.net/${containerName}/${encodeURIComponent(blobName)}`; } else { url = blockBlobClient.url; }

    context.res = { status: 200, body: { url } };
  } catch (err) { context.log("upload-logo error:", err); context.res = { status: 500, body: { error: String(err) } }; }
};
