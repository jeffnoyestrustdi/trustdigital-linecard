const { getClient } = require("../_shared/table");

module.exports = async function (context, req) {
  try {
    const client = await getClient();

    const entities = [];
    for await (const e of client.listEntities()) {
      entities.push({
        id: e.rowKey,
        vendor: e.vendor,
        category: e.category,
        primaryOffering: e.primaryOffering,
        secondaryOffering: e.secondaryOffering,
        tags: e.tags ? JSON.parse(e.tags) : []
      });
    }

    context.res = {
      status: 200,
      headers: { "content-type": "application/json" },
      body: entities
    };
  } catch (err) {
    context.log("LINECARD ERROR:", err);
    context.res = {
      status: 500,
      headers: { "content-type": "text/plain" },
      body: err?.stack || String(err)
    };
  }
};
