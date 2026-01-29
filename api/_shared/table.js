const { TableClient } = require("@azure/data-tables");

async function getClient() {
  // Use a custom env var for Static Web Apps (do NOT rely on AzureWebJobsStorage here).
  // For local dev you can still use AzureWebJobsStorage via local.settings.json.
  const conn = process.env.LINECARD_STORAGE_CONN || process.env.AzureWebJobsStorage;
  if (!conn) {
    throw new Error("Storage connection string is not set. Set LINECARD_STORAGE_CONN (or AzureWebJobsStorage for local dev).");
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