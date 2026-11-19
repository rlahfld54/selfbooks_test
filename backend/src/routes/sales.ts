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
  app.post('/api/sales-journal/partners',async request=>{
    const input=z.object({name:z.string().trim().min(1).max(200),code:z.string().trim().min(1).max(30),businessNumber:z.string().regex(/^(\d{10})?$/)}).strict().safeParse(request.body);
    if(!input.success)throw new SalesError(400,'INVALID_PARTNER','거래처명·코드와 사업자번호 10자리를 확인하세요. 주민번호는 받지 않습니다.');
    return {data:await repo(request).createPartner(input.data)};
  });
  app.get("/api/sales-journal", async (request) => ({ data: await repo(request).list() }));
  app.get('/api/sales-journal/deleted', async request => ({ data: await repo(request).deleted() }));
  app.get('/api/sales-journal/:id/history', async request => {
    const id = z.uuid().safeParse((request.params as {id:string}).id);
    if (!id.success) throw new SalesError(400,'INVALID_ID','전표 식별자를 확인하세요.');
    return {data: await repo(request).history(id.data)};
  });
  app.get('/api/sales-journal/summary', async request => {
    const query = z.object({from:z.iso.date(),to:z.iso.date()}).safeParse(request.query);
    if (!query.success || query.data.from>query.data.to) throw new SalesError(400,'INVALID_RANGE','조회기간을 확인하세요.');
    return {data:await repo(request).summary(query.data.from,query.data.to)};
  });
  for (const action of ['copy','move','bulk'] as const) app.post(`/api/sales-journal/${action}`,async request => {
    const changes = action==='bulk'
      ? z.object({electronic:z.boolean().optional(),item:z.string().max(200).optional(),memo:z.string().max(500).optional()}).strict()
      : z.object({date:z.iso.date(),periodId:z.uuid(),memo:z.string().max(500).optional()}).strict();
    const parsed = z.object({selected:z.array(z.object({id:z.uuid(),version:z.number().int().min(1)}).strict()).min(1).max(100),changes}).strict().safeParse(request.body);
    if (!parsed.success || new Set(parsed.data.selected.map(row=>row.id)).size!==parsed.data.selected.length) throw new SalesError(400,'INVALID_BATCH','선택 전표와 변경값을 확인하세요 (최대 100건).');
    return {data:await repo(request).batch(action,parsed.data.selected,parsed.data.changes)};
  });
  app.post('/api/sales-journal/:id/restore',async request => {
    const parsed=z.object({id:z.uuid(),version:z.number().int().min(1)}).safeParse({...(request.body as object),id:(request.params as {id:string}).id});
    if (!parsed.success) throw new SalesError(400,'INVALID_INPUT','전표 식별자와 버전을 확인하세요.');
    return {data:await repo(request).restore(parsed.data.id,parsed.data.version)};
  });
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
