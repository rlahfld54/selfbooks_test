import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { SalesRepository } from "../services/sales-repository.js";
import { SalesError, validateSales } from "../services/sales-validation.js";
export async function salesRoutes(
  app: FastifyInstance,
  repository?: SalesRepository,
) {
  function repo() {
    if (!repository)
      throw new SalesError(
        503,
        "SALES_UNAVAILABLE",
        "전표 DB 연결 및 개발용 회사 설정을 확인하세요.",
      );
    return repository;
  }
  app.get("/api/sales-journal/meta", async () => ({
    data: await repo().metadata(),
  }));
  app.get("/api/sales-journal", async () => ({ data: await repo().list() }));
  app.post("/api/sales-journal", async (request) => ({
    data: await repo().save(validateSales(request.body), false),
  }));
  app.put("/api/sales-journal/:id", async (request) => {
    const input = validateSales(request.body);
    if ((request.params as { id: string }).id !== input.id)
      throw new SalesError(
        400,
        "INVALID_ID",
        "전표 식별자가 일치하지 않습니다.",
      );
    return { data: await repo().save(input, true) };
  });
  app.delete("/api/sales-journal/:id", async (request) => {
    const parsed = z
      .object({ id: z.uuid(), version: z.coerce.number().int().min(1) })
      .safeParse({
        id: (request.params as { id: string }).id,
        version: (request.query as { version?: string }).version,
      });
    if (!parsed.success)
      throw new SalesError(
        400,
        "INVALID_INPUT",
        "전표 식별자와 버전을 확인하세요.",
      );
    return { data: await repo().remove(parsed.data.id, parsed.data.version) };
  });
}
