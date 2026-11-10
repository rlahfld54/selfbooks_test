import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { loadConfig } from "../src/config/env.js";
import { createPool } from "../src/db/pool.js";
import { buildApp } from "../src/app.js";
import { createSalesRepository } from "../src/services/sales-repository.js";
import { createSalesContext } from "../src/services/sales-context.js";
import { validateSales } from "../src/services/sales-validation.js";
import type { Pool } from "pg";
const config = loadConfig();
if (!config.development || !config.fixtures || !config.databaseUrl)
  throw new Error("Development fixture configuration required");
const pool = createPool(config.databaseUrl, config.caPath);
const app = buildApp({
  frontendOrigin: config.frontendOrigin,
  fixtures: config.fixtures,
  pool,
  salesDevelopment: true,
});
const headers = {
  host: "localhost:4000",
  origin: config.frontendOrigin,
  "content-type": "application/json",
};
const id = randomUUID(),
  rollbackId = randomUUID();
try {
  const metadata = await app.inject({
    url: "/api/sales-journal/meta",
    headers,
  });
  assert.equal(metadata.statusCode, 200, metadata.body);
  const meta = metadata.json().data;
  assert.equal(meta.company, "해솔문구");
  const period = meta.periods.find((p: any) => p.status === "open");
  const body = {
    id,
    version: 0,
    date: period.start,
    periodId: period.id,
    partnerId: meta.partners[0].id,
    type: "11",
    item: "자동 검증 전표",
    supply: "100",
    vat: "0",
    payment: "현금",
    memo: "integration test - removed after check",
    zeroVatConfirmed: true,
    lines: [
      { side: "debit", account: meta.accounts[0].id, amount: "100", memo: "" },
      { side: "credit", account: meta.accounts[1].id, amount: "100", memo: "" },
    ],
  };
  const request = (method: "POST" | "PUT", payload: any) =>
    app.inject({
      method,
      url:
        method === "POST" ? "/api/sales-journal" : `/api/sales-journal/${id}`,
      headers,
      payload,
    });
  assert.equal(
    (await request("POST", { ...body, zeroVatConfirmed: false })).statusCode,
    400,
  );
  assert.equal(
    (
      await request("POST", {
        ...body,
        partnerId: "90000000-0000-4000-8000-000000000002",
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (
      await request("POST", {
        ...body,
        lines: body.lines.map((l) => ({
          ...l,
          account: "80000000-0000-4000-8000-000000000004",
        })),
      })
    ).statusCode,
    400,
  );
  assert.equal(
    (await request("POST", { ...body, date: "2025-12-31" })).statusCode,
    400,
  );
  const saved = await request("POST", body);
  assert.equal(saved.statusCode, 200, saved.body);
  assert.equal(saved.json().data.version, 1);
  assert.equal(saved.json().data.needsReview, true);
  assert.equal((await request("POST", body)).statusCode, 409);
  const list = await app.inject({ url: "/api/sales-journal", headers });
  assert.equal(list.statusCode, 200);
  assert.equal(list.json().data.find((r: any) => r.id === id).lines.length, 2);
  const updated = await request("PUT", {
    ...body,
    version: 1,
    item: "수정 확인",
  });
  assert.equal(updated.statusCode, 200, updated.body);
  assert.equal(updated.json().data.version, 2);
  assert.equal((await request("PUT", { ...body, version: 1 })).statusCode, 409);
  await pool.query(
    "UPDATE public.journal_entries SET status='posted' WHERE id=$1",
    [id],
  );
  assert.equal((await request("PUT", { ...body, version: 2 })).statusCode, 409);
  assert.equal(
    (
      await app.inject({
        method: "DELETE",
        url: `/api/sales-journal/${id}?version=2`,
        headers,
        payload: {},
      })
    ).statusCode,
    409,
  );
  await pool.query(
    "UPDATE public.journal_entries SET status='draft' WHERE id=$1",
    [id],
  );
  assert.equal(
    (
      await app.inject({
        method: "DELETE",
        url: `/api/sales-journal/${id}?version=1`,
        headers,
        payload: {},
      })
    ).statusCode,
    409,
  );
  assert.equal(
    (
      await app.inject({
        method: "DELETE",
        url: `/api/sales-journal/${id}?version=2`,
        headers,
        payload: {},
      })
    ).statusCode,
    200,
  );
  const faultPool = {
    connect: async () => {
      const db = await pool.connect();
      return {
        query: async (sql: string, values?: unknown[]) => {
          if (sql.includes("INSERT INTO public.journal_lines"))
            throw new Error("Injected line failure");
          return db.query(sql, values);
        },
        release: () => db.release(),
      };
    },
  } as unknown as Pool;
  const repo = createSalesRepository(
    faultPool,
    createSalesContext(config.fixtures)!,
  );
  await assert.rejects(
    repo.save(validateSales({ ...body, id: rollbackId }), false),
    /Injected line failure/,
  );
  for (const table of ["journal_entries", "sales_vouchers", "journal_lines"]) {
    const key = table === "journal_entries" ? "id" : "entry_id";
    const result = await pool.query(
      `SELECT count(*)::int AS count FROM public.${table} WHERE ${key}=ANY($1::uuid[])`,
      [[id, rollbackId]],
    );
    assert.equal(result.rows[0].count, 0);
  }
  console.log(
    "PASS actual DB create/read/update/delete, zero VAT, company/account isolation, date bounds, posted status, version conflicts, duplicate retry and atomic rollback",
  );
} finally {
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    for (const table of ["journal_lines", "sales_vouchers", "journal_entries"])
      await db.query(
        `DELETE FROM public.${table} WHERE ${table === "journal_entries" ? "id" : "entry_id"}=ANY($1::uuid[])`,
        [[id, rollbackId]],
      );
    await db.query("COMMIT");
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    db.release();
    await app.close();
  }
}
