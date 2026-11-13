import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import type { SalesRepository } from "../services/sales-repository.js";
import { SalesError, validateSales } from "../services/sales-validation.js";
export async function salesRoutes(
  app: FastifyInstance,
  repository?: SalesRepository | ((request: FastifyRequest) => SalesRepository),
) {
  function repo(request: FastifyRequest) {
    if (!repository)
      throw new SalesError(
        503,
        "SALES_UNAVAILABLE",
        "전표 DB 연결 및 개발용 회사 설정을 확인하세요.",
      );
    return typeof repository === 'function' ? repository(request) : repository;
  }
  app.get("/api/sales-journal/meta", async (request) => ({
    data: await repo(request).metadata(),
  }));
  app.get("/api/sales-journal", async (request) => ({ data: await repo(request).list() }));
  app.post("/api/sales-journal", async (request) => ({
    data: await repo(request).save(validateSales(request.body), false),
  }));
  app.put("/api/sales-journal/:id", async (request) => {
    const input = validateSales(request.body);
    if ((request.params as { id: string }).id !== input.id)
      throw new SalesError(
        400,
        "INVALID_ID",
        "전표 식별자가 일치하지 않습니다.",
      );
    return { data: await repo(request).save(input, true) };
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
    return { data: await repo(request).remove(parsed.data.id, parsed.data.version) };
  });
}
