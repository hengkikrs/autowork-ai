import pg from "pg";

const NullishQueryFunction = () => {
  throw new Error(
    "No database connection string was provided. Perhaps process.env.DATABASE_URL has not been set",
  );
};
NullishQueryFunction.transaction = () => {
  throw new Error(
    "No database connection string was provided. Perhaps process.env.DATABASE_URL has not been set",
  );
};

const pool = process.env.DATABASE_URL
  ? new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX || 5),
      ssl: { rejectUnauthorized: false },
    })
  : null;

function buildQuery(strings, values) {
  let text = strings[0] || "";
  for (let i = 0; i < values.length; i += 1) {
    text += `$${i + 1}${strings[i + 1] || ""}`;
  }
  return { text, values };
}

const sql = pool
  ? async (strings, ...values) => {
      const result = await pool.query(buildQuery(strings, values));
      return result.rows;
    }
  : NullishQueryFunction;

export default sql;
