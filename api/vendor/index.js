const { getClient } = require("../_shared/table");
const { isAdmin } = require("../_shared/auth");
const crypto = require("crypto");

module.exports = async function (context, req) {
  if (!isAdmin(req)) {
    context.res = { status: 403, body: "Forbidden" };
    return;
  }

  const client = getClient();

  if (req.method === "POST") {
    const b = req.body || {};
    const id = crypto.randomUUID();

    await client.createEntity({
      partitionKey: "linecard",
      rowKey: id,
      vendor: b.vendor || "",
      category: b.category || "",
      primaryOffering: b.primaryOffering || "",
      secondaryOffering: b.secondaryOffering || "",
      tags: JSON.stringify(b.tags || [])
    });

    context.res = { status: 201, body: { ok: true, id } };
    return;
  }

  if (req.method === "DELETE") {
    const id = req.query.id;
    if (!id) {
      context.res = { status: 400, body: "Missing id" };
      return;
    }

    await client.deleteEntity("linecard", id);
    context.res = { status: 200, body: { ok: true } };
    return;
  }

  context.res = { status: 405, body: "Method not allowed" };
};
