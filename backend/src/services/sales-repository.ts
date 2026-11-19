import { randomUUID } from "node:crypto";
import { summarizeSales, vatTypes } from "./sales-domain.js";
import { validateSales } from "./sales-validation.js";
import type { Pool, PoolClient } from "pg";
import type { SalesContext } from "./sales-context.js";
import { SalesError, type SalesInput } from "./sales-validation.js";

export function createSalesRepository(pool: Pool, context: SalesContext) {
  const scope = [context.officeId, context.companyId];
  async function transaction<T>(
    work: (db: PoolClient) => Promise<T>,
  ): Promise<T> {
    const db = await pool.connect();
    try {
      await db.query("BEGIN");
      await db.query(`LOCK TABLE public.clients, public.establishments, public.fiscal_periods,
        public.business_partners, public.fi_account, public.fi_summary, public.journal_entries, public.journal_lines, public.sales_vouchers, public.sales_voucher_audit IN ACCESS SHARE MODE`);
      const policy = await db.query<{ blocked: boolean }>(`SELECT EXISTS (
        SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid IN ('public.clients'::regclass,
        'public.establishments'::regclass, 'public.fiscal_periods'::regclass, 'public.fi_account'::regclass, 'public.fi_summary'::regclass,
        'public.business_partners'::regclass, 'public.journal_entries'::regclass,
        'public.journal_lines'::regclass, 'public.sales_vouchers'::regclass, 'public.sales_voucher_audit'::regclass)
        AND NOT pg_catalog.row_security_active(polrelid)) AS blocked`);
      if (policy.rows[0]?.blocked !== false)
        throw new SalesError(
          503,
          "SALES_UNAVAILABLE",
          "전표 접근 정책을 확인해 주세요.",
        );
      const client = await db.query(
        `SELECT c.id FROM public.clients c JOIN public.establishments e
        ON e.office_id=c.office_id AND e.client_id=c.id WHERE c.office_id=$1 AND c.id=$2
        AND c.status IN ('active','pending') AND e.id=$3 FOR SHARE OF c,e`,
        [...scope, context.establishmentId],
      );
      if (!client.rows.length)
        throw new SalesError(
          503,
          "CONTEXT_UNAVAILABLE",
          "서버의 회사·사업장 설정을 확인해 주세요.",
        );
      const result = await work(db);
      await db.query("COMMIT");
      return result;
    } catch (error) {
      await db.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      db.release();
    }
  }
  async function read(db: PoolClient, id?: string, deleted = false) {
    const result = await db.query(
      `SELECT e.id, e.entry_number AS "entryNumber", e.entry_date::text AS date,
      e.fiscal_period_id AS "periodId", e.status, e.description AS memo,
      s.partner_id AS "partnerId", p.partner_name AS partner, COALESCE(p.business_number,'') AS "partnerCode",
      s.transaction_type AS type, s.item, s.supply::text, s.vat::text, s.payment, s.version,
      (s.vat=0 AND s.transaction_type IN ('11','51')) AS "needsReview", s.details,s.deleted_at AS "deletedAt", (s.zero_vat_confirmed_at IS NOT NULL) AS "zeroVatConfirmed",
      CASE WHEN s.deleted_at IS NOT NULL THEN s.deleted_lines ELSE COALESCE((SELECT jsonb_agg(jsonb_build_object('side', CASE WHEN l.debit>0 THEN 'debit' ELSE 'credit' END,
        'account',l.account_id::text,'amount',trunc(l.debit+l.credit)::text,'memo',COALESCE(l.memo,'')) ORDER BY l.line_number)
        FROM public.journal_lines l WHERE l.entry_id=e.id AND l.office_id=e.office_id AND l.client_id=e.client_id),'[]') END AS lines
      FROM public.sales_vouchers s JOIN public.journal_entries e ON e.id=s.entry_id AND e.office_id=s.office_id AND e.client_id=s.client_id
      JOIN public.business_partners p ON p.id=s.partner_id AND p.office_id=s.office_id AND p.client_id=s.client_id
      WHERE e.office_id=$1 AND e.client_id=$2 AND e.establishment_id=$3 AND s.deleted_at IS ${deleted ? "NOT NULL" : "NULL"} ${id ? "AND e.id=$4" : ""}
      ORDER BY e.entry_date DESC,e.id`,
      [...scope, context.establishmentId, ...(id ? [id] : [])],
    );
    return result.rows.map(({ details, ...row }) => ({ ...row, ...(details ?? {}) }));
  }
  async function period(db: PoolClient, id: string, date?: string) {
    const result = await db.query(
      `SELECT starts_on::text AS start,ends_on::text AS end,status
      FROM public.fiscal_periods WHERE office_id=$1 AND client_id=$2 AND id=$3 FOR SHARE`,
      [...scope, id],
    );
    const row = result.rows[0];
    if (!row || row.status !== "open")
      throw new SalesError(
        409,
        "PERIOD_CLOSED",
        "열린 회계기간만 변경할 수 있습니다.",
      );
    if (date && (date < row.start || date > row.end))
      throw new SalesError(
        400,
        "DATE_OUTSIDE_PERIOD",
        "전표일자가 선택한 회계기간 밖입니다.",
      );
  }
  async function existing(db: PoolClient, id: string, version: number, deleted = false) {
    const result = await db.query(
      `SELECT e.status,e.fiscal_period_id AS "periodId",s.version,s.deleted_at
      FROM public.journal_entries e JOIN public.sales_vouchers s ON s.entry_id=e.id
      AND s.office_id=e.office_id AND s.client_id=e.client_id
      WHERE e.office_id=$1 AND e.client_id=$2 AND e.establishment_id=$3 AND e.id=$4 FOR UPDATE OF e,s`,
      [...scope, context.establishmentId, id],
    );
    const row = result.rows[0];
    if (!row || Boolean(row.deleted_at) !== deleted)
      throw new SalesError(404, "NOT_FOUND", "전표를 찾을 수 없습니다.");
    if (row.status !== "draft")
      throw new SalesError(
        409,
        "POSTED_VOUCHER",
        "확정 전표는 수정·삭제할 수 없습니다.",
      );
    if (row.version !== version)
      throw new SalesError(
        409,
        "VERSION_CONFLICT",
        "다른 창에서 변경된 전표입니다. 다시 조회해 주세요.",
      );
    await period(db, row.periodId);
    return row;
  }
  async function audit(db:PoolClient,id:string,action:string,before:unknown,after:unknown) {
    await db.query(`INSERT INTO public.sales_voucher_audit(office_id,client_id,entry_id,actor,action,before_data,after_data) VALUES($1,$2,$3,$4,$5,$6,$7)`,[...scope,id,context.userId,action,JSON.stringify(before),JSON.stringify(after)]);
  }
  async function saveWithin(db:PoolClient,input:SalesInput,update:boolean) {
        if (update) await existing(db, input.id, input.version);
        else if (input.version !== 0)
          throw new SalesError(
            400,
            "INVALID_VERSION",
            "신규 전표의 버전이 올바르지 않습니다.",
          );
        const before = update ? (await read(db,input.id))[0] : null;
        await period(db, input.periodId, input.date);
        const partner = await db.query(
          `SELECT id FROM public.business_partners WHERE office_id=$1 AND client_id=$2 AND id=$3 FOR SHARE`,
          [...scope, input.partnerId],
        );
        if (!partner.rows.length)
          throw new SalesError(
            400,
            "INVALID_PARTNER",
            "현재 회사의 거래처를 선택하세요.",
          );
        const accountIds = [
          ...new Set(input.lines.map((line) => line.account)),
        ];
        const accounts = await db.query(
          `SELECT account_id FROM public.fi_account WHERE client_id=$2 AND account_id::text=ANY($3::text[]) AND is_active AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM public.clients WHERE id=$2 AND office_id=$1) FOR SHARE`,
          [...scope, accountIds],
        );
        if (accounts.rows.length !== accountIds.length)
          throw new SalesError(
            400,
            "INVALID_ACCOUNT",
            "현재 회사의 계정과목을 선택하세요.",
          );
        if (update) {
          await db.query(
            `UPDATE public.journal_entries SET entry_date=$4,fiscal_period_id=$5,description=$6 WHERE office_id=$1 AND client_id=$2 AND id=$3`,
            [...scope, input.id, input.date, input.periodId, input.memo],
          );
          await db.query(
            `DELETE FROM public.journal_lines WHERE office_id=$1 AND client_id=$2 AND entry_id=$3`,
            [...scope, input.id],
          );
        } else {
          await db.query(
            `INSERT INTO public.journal_entries(id,office_id,client_id,establishment_id,fiscal_period_id,entry_date,entry_number,description,status)
          VALUES($3,$1,$2,$4,$5,$6,$7,$8,'draft')`,
            [
              ...scope,
              input.id,
              context.establishmentId,
              input.periodId,
              input.date,
              `PS-${input.id}`,
              input.memo,
            ],
          );
        }
        const values = [
          ...scope,
          input.id,
          input.partnerId,
          input.type,
          input.item,
          input.supply,
          input.vat,
          input.payment,
          ['11','51'].includes(input.type) && input.vat === "0",
          context.userId,
        ];
        if (update) {
          await db.query(
            `UPDATE public.sales_vouchers SET partner_id=$4,transaction_type=$5,item=$6,supply=$7,vat=$8,payment=$9,
          zero_vat_confirmed_at=CASE WHEN $10 THEN now() ELSE NULL END,updated_by=$11,updated_at=now(),version=version+1
          WHERE office_id=$1 AND client_id=$2 AND entry_id=$3`,
            values,
          );
        } else {
          await db.query(
            `INSERT INTO public.sales_vouchers(office_id,client_id,entry_id,partner_id,transaction_type,item,supply,vat,payment,zero_vat_confirmed_at,created_by,updated_by)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,CASE WHEN $10 THEN now() ELSE NULL END,$11,$11)`,
            values,
          );
        }
        for (const [index, line] of input.lines.entries()) {
          await db.query(
            `INSERT INTO public.journal_lines(office_id,client_id,entry_id,line_number,account_id,partner_id,memo,debit,credit)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
            [
              ...scope,
              input.id,
              index + 1,
              line.account,
              input.partnerId,
              line.memo,
              line.side === "debit" ? line.amount : "0",
              line.side === "credit" ? line.amount : "0",
            ],
          );
        }
        await db.query('UPDATE public.sales_vouchers SET details=$4 WHERE office_id=$1 AND client_id=$2 AND entry_id=$3',[...scope,input.id,JSON.stringify({electronic:input.electronic,quantity:input.quantity,unitPrice:input.unitPrice,journalType:input.journalType,items:input.items,cardCompany:input.cardCompany,nonDeductionReason:input.nonDeductionReason,evidenceNumber:input.evidenceNumber})]);
        const after = (await read(db,input.id))[0];
        await audit(db,input.id,update?'update':'create',before,after);
        return after;

  }
  return {
    createPartner: (input: {name:string;code:string;businessNumber:string}) => transaction(async db => {
      const result=await db.query(`INSERT INTO public.business_partners(office_id,client_id,partner_name,partner_code,business_number) VALUES($1,$2,$3,$4,NULLIF($5,'')) RETURNING id,partner_name AS name,COALESCE(business_number,'') AS code`,[...scope,input.name,input.code,input.businessNumber]);
      return result.rows[0];
    }),
    metadata: () =>
      transaction(async (db) => {
        const company = await db.query(
          `SELECT client_name AS name FROM public.clients WHERE office_id=$1 AND id=$2`,
          scope,
        );
        const periods = await db.query(
          `SELECT id,period_label AS label,starts_on::text AS start,ends_on::text AS end,status
        FROM public.fiscal_periods WHERE office_id=$1 AND client_id=$2 ORDER BY starts_on DESC`,
          scope,
        );
        const accounts = await db.query(
          `SELECT account_id::text AS id,account_code::text AS code,account_name AS name FROM public.fi_account WHERE client_id=$2 AND is_active AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM public.clients WHERE id=$2 AND office_id=$1) ORDER BY account_code`,
          scope,
        );
        const partners = await db.query(
          `SELECT id,partner_name AS name,partner_code AS code,COALESCE(business_number,'') AS "businessNumber" FROM public.business_partners WHERE office_id=$1 AND client_id=$2 ORDER BY partner_name`,
          scope,
        );
        const summaries = await db.query(`SELECT summary_id::text AS id,account_id::text AS "accountId",summary_text AS text FROM public.fi_summary WHERE client_id=$2 AND is_active AND deleted_at IS NULL AND EXISTS(SELECT 1 FROM public.clients WHERE id=$2 AND office_id=$1) ORDER BY sort_order,summary_id`,scope);
        return {
          company: company.rows[0].name,
          companyId: context.companyId,
          establishmentId: context.establishmentId,
          vatTypes,
          establishment: "본점",
          user: context.userId,
          periods: periods.rows,
          accounts: accounts.rows,
          partners: partners.rows,
          summaries: summaries.rows,
        };
      }),
    list: () => transaction((db) => read(db)),
    save: (input: SalesInput, update: boolean) => transaction(db => saveWithin(db,input,update)),
    deleted: () => transaction(db => read(db,undefined,true)),
    history: (id: string) => transaction(async db => {
      const result = await db.query(`SELECT a.action,a.actor,a.created_at AS "createdAt",a.before_data AS before,a.after_data AS after FROM public.sales_voucher_audit a JOIN public.journal_entries e ON e.id=a.entry_id AND e.office_id=a.office_id AND e.client_id=a.client_id WHERE a.office_id=$1 AND a.client_id=$2 AND a.entry_id=$3 AND e.establishment_id=$4 ORDER BY a.id DESC`, [...scope,id,context.establishmentId]);
      return result.rows;
    }),
    summary: (from: string,to: string) => transaction(async db => summarizeSales((await read(db)).filter(row => row.date>=from && row.date<=to))),
    batch: (action: 'copy'|'move'|'bulk', selected: {id:string;version:number}[], changes: Record<string,unknown>) => transaction(async db => {
      const result = [];
      for (const selection of [...selected].sort((a,b)=>a.id.localeCompare(b.id))) {
        await existing(db,selection.id,selection.version);
        const row = (await read(db,selection.id))[0];
        const {partner,partnerCode,status,entryNumber,needsReview,deletedAt,...draft}=row;
        const input=validateSales({...draft,...changes,id:action==='copy'?randomUUID():row.id,version:action==='copy'?0:row.version});
        result.push(await saveWithin(db,input,action!=='copy'));
      }
      return result;
    }),
    remove: (id:string,version:number) => transaction(async db => {
      await existing(db,id,version);
      const before=(await read(db,id))[0];
      await db.query(`UPDATE public.sales_vouchers SET deleted_at=now(),deleted_by=$4,deleted_lines=$5,version=version+1 WHERE office_id=$1 AND client_id=$2 AND entry_id=$3`,[...scope,id,context.userId,JSON.stringify(before.lines)]);
      await db.query(`DELETE FROM public.journal_lines WHERE office_id=$1 AND client_id=$2 AND entry_id=$3`,[...scope,id]);
      await audit(db,id,'delete',before,null);
      return {id};
    }),
    restore: (id:string,version:number) => transaction(async db => {
      await existing(db,id,version,true);
      const row=(await read(db,id,true))[0];
      const {partner,partnerCode,status,entryNumber,needsReview,deletedAt,...draft}=row;
      const input=validateSales(draft);
      await db.query(`UPDATE public.sales_vouchers SET deleted_at=NULL,deleted_by=NULL WHERE office_id=$1 AND client_id=$2 AND entry_id=$3`,[...scope,id]);
      const after=await saveWithin(db,input,true);
      await audit(db,id,'restore',row,after);
      return after;
    }),
  };
}
export type SalesRepository = ReturnType<typeof createSalesRepository>;
