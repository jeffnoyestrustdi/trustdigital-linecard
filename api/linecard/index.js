const { getClient } = require("../_shared/table");

module.exports = async function (context, req) {
  const client = await getClient();

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
    headers: { "content-type": "application/json" },
    body: entities
  };
};
