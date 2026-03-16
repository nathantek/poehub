// Simple MySQL connection helper for PoeHUB
// Expects DATABASE_URL env var (standard MySQL connection string, e.g. mysql://user:pass@host:3306/dbname)

const mysql = require("mysql2/promise");

if (!process.env.DATABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    "[PoeHUB] DATABASE_URL is not set. Backend will start but DB queries will fail until configured."
  );
}

const pool = mysql.createPool(process.env.DATABASE_URL);

async function query(sql, params) {
  const start = Date.now();
  const [rows] = await pool.execute(sql, params);
  const duration = Date.now() - start;
  // eslint-disable-next-line no-console
  console.log("DB query", { sql, duration, rows: rows.length });
  return rows;
}

module.exports = {
  query,
  pool,
};

