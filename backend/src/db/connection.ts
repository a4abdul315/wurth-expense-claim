import mysql from "mysql2/promise";
import { env } from "../config/env";

export const pool = mysql.createPool({
  uri:              env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit:  10,
  timezone:         "+00:00",
});

// Use any[] for params — mysql2's type system for params is overly strict
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = Record<string, unknown>>(sql: string, params?: any[]): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function run(sql: string, params?: any[]): Promise<mysql.ResultSetHeader> {
  const [result] = await pool.query(sql, params);
  return result as mysql.ResultSetHeader;
}

export async function testConnection(): Promise<void> {
  const conn = await pool.getConnection();
  conn.release();
}
