const { TableClient } = require("@azure/data-tables");

function getClient() {
  const conn = process.env.AzureWebJobsStorage;
  const tableName = "LineCard";
  return TableClient.fromConnectionString(conn, tableName);
}

module.exports = { getClient };
