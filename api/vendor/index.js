const { getClient } = require("../_shared/table");
const { isAdmin, getUserEmail } = require("../_shared/auth");
const crypto = require("crypto");

module.exports = async function (context, req) {
  try {
    context.log("vendor invoked", { method: req.method });

    // Log whether the SWA identity header was present
    const encoded = req.headers && req.headers["x-ms-client-principal"];
    context.log("vendor: x-ms-client-principal present:", !!encoded);

    // Also log the email as extracted by our helper (if any)
    const email = getUserEmail(req);
    context.log("vendor: extracted email:", email || "(none)");

    // GET endpoint - list all vendors (no auth required for read)
    if (req.method === "GET") {
      const client = await getClient();
      const entities = [];
      for await (const e of client.listEntities()) {
        entities.push(e);
      }
      context.res = { status: 200, headers: { "content-type": "application/json" }, body: entities };
      return;
    }

    // Authorization check for POST/DELETE
    if (!isAdmin(req)) {
      context.log("vendor: isAdmin returned false");
      context.res = { status: 403, headers: { "content-type": "text/plain" }, body: "Forbidden" };
      return;
    }

    // Attempt to get storage client (this can throw if conn string missing)
    const client = await getClient();

    if (req.method === "POST") {
      const b = req.body || {};
      const id = crypto.randomUUID();

      const entity = {
        partitionKey: "linecard",
        rowKey: id,
        vendor: b.vendor || "",
        category: b.category || "",
        primaryOffering: b.primaryOffering || "",
        secondaryOffering: b.secondaryOffering || "",
        tags: JSON.stringify(b.tags || []),
        createdBy: email || "",
        createdAt: new Date().toISOString()
      };

      // Add logo URL if provided
      if (b.logo) entity.logoUrl = b.logo;
      
      // Add enrichment data if provided
      if (b.enrich) entity.enrich = JSON.stringify(b.enrich);

      await client.createEntity(entity);

      context.res = { status: 201, headers: { "content-type": "application/json" }, body: { ok: true, id } };
      return;
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      if (!id) {
        context.res = { status: 400, headers: { "content-type": "text/plain" }, body: "Missing id" };
        return;
      }

      await client.deleteEntity("linecard", id);
      context.res = { status: 200, headers: { "content-type": "application/json" }, body: { ok: true } };
      return;
    }

    context.res = { status: 405, headers: { "content-type": "text/plain" }, body: "Method not allowed" };
  } catch (err) {
    // Log and return the stack so we can see the exact failure in the browser and logs.
    context.log("vendor: UNHANDLED ERROR:", err?.stack || String(err));
    context.res = {
      status: 500,
      headers: { "content-type": "text/plain" },
      body: err?.stack || String(err)
    };
  }
};