import { query } from "../db/connection";

export async function nextReference(): Promise<string> {
  const year   = new Date().getFullYear();
  const prefix = `WPS-${year}-`;
  const [{ cnt }] = await query<{cnt:number}>(
    `SELECT COUNT(*) AS cnt FROM expense_claims WHERE reference LIKE ?`,
    [`${prefix}%`]
  );
  return `${prefix}${String(Number(cnt) + 1).padStart(4, "0")}`;
}
