import { z } from 'zod'
import { SalesError } from './sales-validation.js'

const schema = z.object({
  batchId: z.uuid(),
  rows: z.array(z.object({
    sourceLine: z.number().int().min(2).max(5001),
    information: z.record(z.string().max(200), z.string().max(1000)),
    importIssues: z.array(z.string().max(1200)).max(200).default([]),
  }).strict()).min(1).max(5000),
}).strict()
export function validatePartnerImport(body: unknown) {
  const parsed = schema.safeParse(body)
  if (!parsed.success) throw new SalesError(400, 'INVALID_PARTNERS', '엑셀 데이터 형식과 최대 5,000행·항목별 1,000자 제한을 확인하세요.')
  if (new Set(parsed.data.rows.map(row => row.sourceLine)).size !== parsed.data.rows.length)
    throw new SalesError(400, 'INVALID_PARTNERS', '원본 행 번호가 중복됩니다.')
  for (const row of parsed.data.rows) {
    if (Object.keys(row.information).length > 100 || (row.information.name?.length ?? 0) > 100 || (row.information.representative?.length ?? 0) > 100)
      throw new SalesError(400, 'INVALID_PARTNERS', `${row.sourceLine}행: 최대 100열, 업체명·대표자명 100자 제한을 확인하세요.`)
  }
  return parsed.data
}
export type PartnerImport = ReturnType<typeof validatePartnerImport>
export const digits = (value = '') => value.replace(/[\s-]/g, '')
export function partnerKey(info: Record<string, string>) {
  return JSON.stringify([digits(info.registration), ...['industryCode', 'businessCategory', 'industry'].map(key => (info[key] ?? '').trim())])
}
export function partnerIssues(info: Record<string, string>, keys: Set<string>, codes: Set<string>) {
  const issues: string[] = []
  if (!info.name?.trim()) issues.push('거래처명이 없습니다.')
  if (!/^\d{10}$/.test(digits(info.registration))) issues.push('사업자등록번호는 숫자 10자리여야 합니다.')
  if (keys.has(partnerKey(info))) issues.push('사업자등록번호·업종코드·업태·업종이 모두 같은 거래처가 기존 목록 또는 파일 안에서 중복됩니다.')
  if (!['1', '2', '개인', '법인', '개인사업자', '법인사업자'].includes(info.businessType ?? '')) issues.push('사업자 구분은 1(개인) 또는 2(법인)이어야 합니다.')
  if (info.corporationNumber && !/^\d{13}$/.test(digits(info.corporationNumber))) issues.push('법인등록번호는 숫자 13자리여야 합니다.')
  if (!info.representative?.trim()) issues.push('대표자명이 비어 있습니다.')
  if (info.postalCode && !/^\d{5}$/.test(info.postalCode)) issues.push('우편번호를 확인하세요.')
  for (const field of ['email', 'invoiceEmail']) if (info[field] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info[field]!)) issues.push('이메일 형식이 올바르지 않습니다.')
  if (info.code && codes.has(info.code)) issues.push('거래처 코드가 중복됩니다.')
  keys.add(partnerKey(info)); if (info.code) codes.add(info.code)
  return issues
}
