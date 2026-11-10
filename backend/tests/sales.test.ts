import assert from "node:assert/strict";
import test from "node:test";
import Fastify from "fastify";
import { salesRoutes } from "../src/routes/sales.js";
import { validateSales, SalesError } from "../src/services/sales-validation.js";
import { buildApp } from "../src/app.js";
import {
  createSalesRepository,
  type SalesRepository,
} from "../src/services/sales-repository.js";
import type { Pool } from "pg";
const id = "10000000-0000-4000-8000-000000000001";
const draft = () => ({
  id,
  version: 0,
  date: "2026-11-10",
  periodId: id,
  partnerId: id,
  type: "11",
  item: "",
  supply: "100",
  vat: "10",
  payment: "현금",
  memo: "",
  zeroVatConfirmed: false,
  lines: [
    { side: "debit", account: id, amount: "110", memo: "" },
    { side: "credit", account: id, amount: "110", memo: "" },
  ],
});
const rejects = (body: unknown, code: string) =>
  assert.throws(
    () => validateSales(body),
    (error) => error instanceof SalesError && error.code === code,
  );
test("balanced entries pass; invalid money, dates, types and company injection fail", () => {
  assert.equal(validateSales(draft()).vat, "10");
  for (const supply of ["-1", "1.1", "1e3", "01", "9".repeat(16)])
    rejects({ ...draft(), supply }, "INVALID_INPUT");
  rejects({ ...draft(), date: "2026-02-30" }, "INVALID_INPUT");
  rejects({ ...draft(), type: "12" }, "INVALID_INPUT");
  rejects({ ...draft(), companyId: id }, "INVALID_INPUT");
  rejects({ ...draft(), lines: [] }, "INVALID_INPUT");
  const bad = draft();
  bad.lines[0]!.amount = "109";
  rejects(bad, "UNBALANCED");
  bad.lines[0]!.amount = "0";
  rejects(bad, "INVALID_LINE");
});
test("11 and 51 zero VAT require confirmation; arithmetic is exact", () => {
  for (const type of ["11", "51"]) {
    rejects({ ...draft(), type, vat: "0" }, "ZERO_VAT_CONFIRMATION");
    assert.equal(
      validateSales({ ...draft(), type, vat: "0", zeroVatConfirmed: true }).vat,
      "0",
    );
  }
  const input = draft();
  input.lines = Array.from({ length: 100 }, (_, i) => ({
    side: i < 50 ? "debit" : "credit",
    account: id,
    amount: "999999999999999",
    memo: "",
  }));
  assert.equal(validateSales(input).lines.length, 100);
  input.lines[99]!.amount = "999999999999998";
  rejects(input, "UNBALANCED");
});
test("writes require local origin and configured development context", async (t) => {
  const app = buildApp({ frontendOrigin: "http://localhost:3000" });
  t.after(() => app.close());
  for (const headers of [
    { host: "localhost:4000" },
    { host: "localhost:4000", origin: "https://evil.example" },
  ]) {
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/sales-journal",
          headers,
          payload: draft(),
        })
      ).statusCode,
      403,
    );
  }
  assert.equal(
    (
      await app.inject({
        method: "POST",
        url: "/api/sales-journal",
        headers: { host: "localhost:4000", origin: "http://localhost:3000" },
        payload: draft(),
      })
    ).statusCode,
    503,
  );
});
test("delete cannot override the route ID with a query ID", async (t) => {
  const app = Fastify();
  t.after(() => app.close());
  let deleted = "";
  await salesRoutes(app, {
    remove: async (value: string) => {
      deleted = value;
      return { id: value };
    },
  } as SalesRepository);
  assert.equal(
    (
      await app.inject({
        method: "DELETE",
        url: `/api/sales-journal/${id}?version=1&id=20000000-0000-4000-8000-000000000001`,
      })
    ).statusCode,
    200,
  );
  assert.equal(deleted, id);
});
test("repository rolls back and releases on policy failure", async () => {
  const calls: string[] = [];
  let released = false;
  const pool = {
    connect: async () => ({
      query: async (sql: string) => {
        calls.push(sql);
        return { rows: [{ blocked: true }] };
      },
      release: () => {
        released = true;
      },
    }),
  } as unknown as Pool;
  const repo = createSalesRepository(pool, {
    officeId: id,
    companyId: id,
    establishmentId: id,
    userId: "test",
  });
  await assert.rejects(
    repo.list(),
    (error) =>
      error instanceof SalesError && error.code === "SALES_UNAVAILABLE",
  );
  assert.equal(calls.at(-1), "ROLLBACK");
  assert.equal(released, true);
});

test("closed accounting period rejects a write before inserting anything", async () => {
  const calls: string[] = [];
  const pool = {
    connect: async () => ({
      query: async (sql: string) => {
        calls.push(sql);
        if (sql.includes("pg_catalog.pg_policy"))
          return { rows: [{ blocked: false }] };
        if (sql.includes("JOIN public.establishments"))
          return { rows: [{ id }] };
        if (sql.includes("FROM public.fiscal_periods"))
          return {
            rows: [
              { start: "2026-01-01", end: "2026-12-31", status: "closed" },
            ],
          };
        return { rows: [] };
      },
      release() {},
    }),
  } as unknown as Pool;
  const repo = createSalesRepository(pool, {
    officeId: id,
    companyId: id,
    establishmentId: id,
    userId: "test",
  });
  await assert.rejects(
    repo.save(validateSales(draft()), false),
    (error) => error instanceof SalesError && error.code === "PERIOD_CLOSED",
  );
  assert.equal(
    calls.some((sql) => sql.includes("INSERT")),
    false,
  );
  assert.equal(calls.at(-1), "ROLLBACK");
});
