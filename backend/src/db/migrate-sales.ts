import { readFile } from "node:fs/promises";
import { loadConfig } from "../config/env.js";
import { createPool } from "./pool.js";
const config = loadConfig();
if (!config.development || !config.databaseUrl)
  throw new Error("Local development database required");
const pool = createPool(config.databaseUrl, config.caPath);
try {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(604110001)");
    await db.query(
      await readFile(
        new URL("../../migrations/001_sales_vouchers.sql", import.meta.url),
        "utf8",
      ),
    );
    await db.query("COMMIT");
    console.log("Sales voucher migration applied");
  } catch {
    await db.query("ROLLBACK");
    throw new Error("Migration failed");
  } finally {
    db.release();
  }
} catch {
  console.error("Sales migration failed");
  process.exitCode = 1;
} finally {
  await pool.end();
}
