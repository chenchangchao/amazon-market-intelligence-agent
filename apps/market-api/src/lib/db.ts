import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

export const pool = new Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export async function query<T = any>(sql: string, params: any[] = []) {
  const start = Date.now();
  const result = await pool.query(sql, params);
  return {
    rows: result.rows as T[],
    rowCount: result.rowCount ?? 0,
    latency_ms: Date.now() - start,
  };
}
