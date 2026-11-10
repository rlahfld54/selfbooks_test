import { z } from "zod";
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
    type: z.enum(["11", "51"]),
    item: z.string().max(200),
    supply: amount,
    vat: amount,
    payment: z.enum(["외상", "현금", "예금", "카드", "기타"]),
    memo: z.string().max(500),
    zeroVatConfirmed: z.boolean(),
    lines: z
      .array(
        z
          .object({
            side: z.enum(["debit", "credit"]),
            account: z.uuid(),
            amount,
            memo: z.string().max(500),
          })
          .strict(),
      )
      .min(2)
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
  if (input.vat === "0" && !input.zeroVatConfirmed)
    throw new SalesError(
      400,
      "ZERO_VAT_CONFIRMATION",
      "과세 거래의 부가세가 0원입니다. 확인요망 항목을 확인해 주세요.",
    );
  return input;
}
