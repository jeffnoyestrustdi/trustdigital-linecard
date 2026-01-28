const { TableClient } = require("@azure/data-tables");

async function getClient() {
  const conn = process.env.AzureWebJobsStorage;
  if (!conn) {
    throw new Error("AzureWebJobsStorage is not set");
  }

  const tableName = "LineCard";
  const client = TableClient.fromConnectionString(conn, tableName);

  try {
    await client.createTable();
  } catch (e) {
    if (e.statusCode !== 409) throw e; // 409 = already exists
  }

  return client;
}

module.exports = { getClient };
