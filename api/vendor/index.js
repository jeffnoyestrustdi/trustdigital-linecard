const { isAdmin, getUserEmail } = require("../_shared/auth");
const { v4: uuidv4 } = require("uuid");
const { TableClient } = require("@azure/data-tables");

function getTableClient() {
  const conn = process.env.LINECARD_STORAGE_CONN;
  if (!conn) throw new Error("LINECARD_STORAGE_CONN not set");
  const tableName = process.env.LINECARD_TABLE || "LineCard";
  return TableClient.fromConnectionString(conn, tableName);
}

module.exports = async function (context, req) {
  try {
    const method = (req.method || "GET").toUpperCase();

    if (method === "GET") {
      const client = getTableClient();
      const entities = [];
      for await (const e of client.listEntities()) entities.push(e);
      context.res = { status: 200, body: entities };
      return;
    }

    if (method === "POST") {
      if (!isAdmin(req)) { context.res = { status: 403, body: { error: "Forbidden" } }; return; }
      const body = req.body || {};
      const vendor = (body.vendor || "").trim();
      if (!vendor) { context.res = { status: 400, body: { error: "vendor is required" } }; return; }

      const entity = {
        partitionKey: "vendor",
        rowKey: uuidv4(),
        vendor,
        category: body.category || "",
        primaryOffering: body.primaryOffering || "",
        secondaryOffering: body.secondaryOffering || "",
        tags: JSON.stringify(body.tags || []),
        createdBy: getUserEmail(req) || "",
        createdAt: new Date().toISOString()
      };

      if (body.logo) entity.logoUrl = body.logo;
      if (body.enrich) entity.enrich = JSON.stringify(body.enrich);

      const client = getTableClient();
      await client.createEntity(entity);
      context.res = { status: 201, body: { id: entity.rowKey } };
      return;
    }

    if (method === "DELETE") {
      if (!isAdmin(req)) { context.res = { status: 403, body: { error: "Forbidden" } }; return; }
      const id = req.query.id || (req.body && req.body.id);
      if (!id) { context.res = { status: 400, body: { error: "Missing id" } }; return; }
      const client = getTableClient();
      await client.deleteEntity("vendor", id);
      context.res = { status: 200, body: { deleted: id } };
      return;
    }

    context.res = { status: 405, body: { error: "Method not supported" } };
  } catch (err) { context.log("vendor api error:", err); context.res = { status: 500, body: { error: String(err) } }; }
};