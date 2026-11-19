import { z } from "zod";
import { vatTypes } from './sales-domain.js';
export class SalesError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
const amount = z.string().regex(/^(0|[1-9]\d{0,14})$/);
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      Number.isFinite(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
  );
export const salesInput = z
  .object({
    id: z.uuid(),
    version: z.number().int().min(0),
    date,
    periodId: z.uuid(),
    partnerId: z.uuid(),
    type: z.string().refine(code => vatTypes.some(type => type.code === code && type.enabled)),
    item: z.string().max(200),
    supply: amount,
    vat: amount,
    payment: z.enum(["외상", "현금", "예금", "카드", "기타"]),
    memo: z.string().max(500),
    zeroVatConfirmed: z.boolean(),
    electronic: z.boolean().default(false),
    quantity: z.string().regex(/^\d{1,12}(\.\d{1,6})?$/).default('1'),
    unitPrice: z.string().regex(/^\d{1,15}(\.\d{1,6})?$/).default('0'),
    journalType: z.enum(['0','1','2','3','4','5']).optional(),
    nonDeductionReason: z.string().max(200).default(''),
    cardCompany: z.string().max(100).default(''),
    evidenceNumber: z.string().max(100).default(''),
    items: z.array(z.object({ name: z.string().max(200), quantity: z.string().regex(/^\d{1,12}(\.\d{1,6})?$/), unitPrice: z.string().regex(/^\d{1,15}(\.\d{1,6})?$/), supply: amount, vat: amount }).strict()).max(100).default([]),
    lines: z
      .array(
        z
          .object({
            side: z.enum(["debit", "credit"]),
            account: z.union([z.uuid(), z.string().regex(/^[1-9]\d{0,18}$/)]),
            amount,
            memo: z.string().max(500),
          })
          .strict(),
      )
      .max(100),
  })
  .strict();
export type SalesInput = z.infer<typeof salesInput>;
export function validateSales(body: unknown): SalesInput {
  const parsed = salesInput.safeParse(body);
  if (!parsed.success)
    throw new SalesError(
      400,
      "INVALID_INPUT",
      "날짜·거래처·금액·분개 입력을 확인하세요. 금액은 15자리 이내 원 단위 정수입니다.",
    );
  const input = parsed.data;
  if (input.journalType === '0' ? input.lines.length !== 0 : input.lines.length < 2)
    throw new SalesError(400, 'INVALID_INPUT', '분개없음은 0행, 다른 분개유형은 2행 이상 필요합니다.');
  const type = vatTypes.find(type => type.code === input.type)!;
  if (['zero','exempt'].includes(type.taxCategory) && input.vat !== '0')
    throw new SalesError(400, 'INVALID_VAT', '영세·면세 유형의 부가세는 0원이어야 합니다.');
  if (input.type === '54' && !input.nonDeductionReason.trim())
    throw new SalesError(400, 'REASON_REQUIRED', '불공제 사유를 입력하세요.');
  if (type.requiresCardCompany && !input.cardCompany.trim())
    throw new SalesError(400, 'CARD_REQUIRED', '카드사를 입력하세요.');
  if (input.items.length && (input.items.reduce((n, i) => n + BigInt(i.supply), 0n) !== BigInt(input.supply) || input.items.reduce((n, i) => n + BigInt(i.vat), 0n) !== BigInt(input.vat)))
    throw new SalesError(400, 'ITEM_TOTAL', '복수 품목과 전표 합계가 일치하지 않습니다.');
  let debit = 0n,
    credit = 0n;
  for (const line of input.lines) {
    const value = BigInt(line.amount);
    if (value <= 0n)
      throw new SalesError(
        400,
        "INVALID_LINE",
        "분개 금액은 0보다 커야 합니다.",
      );
    if (line.side === "debit") debit += value;
    else credit += value;
  }
  if (debit !== credit)
    throw new SalesError(
      400,
      "UNBALANCED",
      "차변과 대변 합계가 일치하지 않습니다.",
    );
  if (BigInt(input.supply) + BigInt(input.vat) === 0n)
    throw new SalesError(400, "ZERO_TOTAL", "전표 합계는 0보다 커야 합니다.");
  if (input.journalType && input.journalType !== '0' && debit !== BigInt(input.supply) + BigInt(input.vat))
    throw new SalesError(400, 'JOURNAL_TOTAL', '분개 합계와 공급가액·부가세 합계가 일치하지 않습니다.');
  if (['11','51'].includes(input.type) && input.vat === "0" && !input.zeroVatConfirmed)
    throw new SalesError(
      400,
      "ZERO_VAT_CONFIRMATION",
      "과세 거래의 부가세가 0원입니다. 확인요망 항목을 확인해 주세요.",
    );
  return input;
}
