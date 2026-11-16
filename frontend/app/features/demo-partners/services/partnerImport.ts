import * as XLSX from 'xlsx'
import type { DemoRow } from './mockPartners.ts'

export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const fields = [
  ['registration', '사업자등록번호', ['사업자번호']],
  ['businessType', '사업자 구분', []],
  ['corporationNumber', '법인등록번호', []],
  ['name', '업체 명', ['거래처명', '업체명', '상호']],
  ['representative', '대표자 명', ['대표자명', '대표자']],
  ['industryCode', '업종코드', []], ['businessCategory', '업태', []], ['industry', '업종', []],
  ['postalCode', '우편번호', []], ['address', '기본주소', ['주소']], ['addressDetail', '상세주소', []],
  ['contactName', '사용자명', ['담당자명']],
  ['phone', '사용자(담당자) 전화번호', ['전화번호', '담당자전화번호']],
  ['email', '사용자(담당자) 개인이메일', ['이메일', '담당자이메일']],
  ['mobile', '사용자(담당자) 휴대전화번호', ['휴대전화번호', '휴대폰번호']],
  ['code', '거래처 코드', ['거래처코드', '코드']], ['tradeType', '매출/매입 구분', []],
  ['active', '사용 여부', []], ['invoiceEmail', '세금계산서 수신 이메일', []], ['memo', '메모', ['비고']],
] as const
export const requiredFields = fields.slice(0, 10)
export type ImportedPartner = DemoRow & { registration: string; information: Record<string, string>; importIssues: string[]; sourceLine: number }
export interface ImportRow { line: number; values: Record<string, string>; errors: string[]; warnings: string[] }
export interface ImportPreview { headers: string[]; unknown: string[]; rows: ImportRow[] }
const normalize = (text: string) => text.replace(/\(\*\)|\[.*?\]|ex\).*$/gi, '').replace(/\s/g, '').trim()
const digits = (text: string) => text.replace(/[\s-]/g, '')
const partnerKey = (registration: string, information: Record<string, string> = {}) => JSON.stringify([digits(registration), ...['industryCode', 'businessCategory', 'industry'].map(key => (information[key] || '').trim())])

export function readPartnerWorkbook(buffer: ArrayBuffer) {
  if (buffer.byteLength > MAX_FILE_BYTES) throw new Error('파일은 5MB 이하만 선택할 수 있습니다.')
  const bytes = new Uint8Array(buffer)
  if (!((bytes[0] === 0xd0 && bytes[1] === 0xcf) || (bytes[0] === 0x50 && bytes[1] === 0x4b))) throw new Error('올바른 XLS 또는 XLSX 파일이 아닙니다.')
  return XLSX.read(buffer, { type: 'array', cellFormula: true, sheetRows: 5002 })
}

export function previewPartners(workbook: XLSX.WorkBook, sheetName: string, existing: (DemoRow & { registration?: string; information?: Record<string, string> })[]): ImportPreview {
  const sheet = workbook.Sheets[sheetName]
  if (!sheet || !sheet['!ref']) throw new Error('선택한 시트가 비어 있습니다.')
  const range = XLSX.utils.decode_range(sheet['!fullref'] || sheet['!ref'])
  if (range.e.r > 5000 || range.e.c > 99) throw new Error('시트는 헤더 포함 5,001행, 100열 이내여야 합니다.')
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '', range: 0 })
  const headers = (matrix[0] || []).map(String)
  const keys = headers.map(header => fields.find(([, label, aliases]) => [label, ...aliases].some(alias => normalize(alias) === normalize(header)))?.[0])
  const missingHeaders = requiredFields.filter(([key]) => !keys.includes(key))
  if (missingHeaders.length) throw new Error(`첫 행에 필수 컬럼이 없습니다: ${missingHeaders.map(([, label]) => label).join(', ')}`)
  if (keys.filter(Boolean).length !== new Set(keys.filter(Boolean)).size) throw new Error('같은 항목에 해당하는 컬럼이 중복되어 있습니다.')
  const registrations = new Set(existing.filter(row => row.registration).map(row => partnerKey(row.registration!, row.information)))
  const codes = new Set(existing.map(row => row.code))
  const rows: ImportRow[] = []
  matrix.slice(1).forEach((cells, index) => {
    if (!cells.some(value => String(value).trim())) return
    const row: ImportRow = { line: index + 2, values: {}, errors: [], warnings: [] }
    headers.forEach((header, column) => {
      const value = String(cells[column] || '').trim()
      row.values[keys[column] || `extra:${column}:${header}`] = value
      if (sheet[XLSX.utils.encode_cell({ r: index + 1, c: column })]?.f) row.errors.push(`${header}: 수식 대신 값을 입력하세요.`)
      if (value.length > 1000) row.errors.push(`${header}: 1,000자를 초과했습니다.`)
    })
    const v = row.values
    v.registration = digits(v.registration || '')
    if (!v.name) row.errors.push('거래처명이 없습니다.')
    if (!/^\d{10}$/.test(v.registration)) row.errors.push('사업자등록번호는 숫자 10자리여야 합니다.')
    else if (registrations.has(partnerKey(v.registration, v))) row.errors.push('사업자등록번호·업종코드·업태·업종이 모두 같은 거래처가 기존 목록 또는 파일 안에서 중복됩니다.')
    registrations.add(partnerKey(v.registration, v))
    if (!['1', '2', '개인', '법인', '개인사업자', '법인사업자'].includes(v.businessType || '')) row.errors.push('사업자 구분은 1(개인) 또는 2(법인)이어야 합니다.')
    if (v.code) { if (codes.has(v.code)) row.errors.push('거래처 코드가 중복됩니다.'); codes.add(v.code) }
    if (v.corporationNumber && !/^\d{13}$/.test(digits(v.corporationNumber))) row.errors.push('법인등록번호는 숫자 13자리여야 합니다.')
    if (v.postalCode && !/^\d{5}$/.test(v.postalCode)) row.warnings.push('우편번호를 확인하세요.')
    for (const key of ['email', 'invoiceEmail']) if (v[key] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v[key]!)) row.errors.push('이메일 형식이 올바르지 않습니다.')
    if (!v.representative) row.warnings.push('대표자명이 비어 있습니다.')
    rows.push(row)
  })
  if (!rows.length) throw new Error('등록할 거래처가 없습니다.')
  return { headers, unknown: headers.filter((header, i) => header && !keys[i]), rows }
}

export function preparePartners(preview: ImportPreview, existing: DemoRow[]): ImportedPartner[] {
  const ids = new Set(existing.map(row => row.id))
  let nextId = 1
  const used = new Set([...existing.map(row => row.code), ...preview.rows.map(row => row.values.code).filter(Boolean)])
  let next = 1
  return preview.rows.map(row => {
    let code = row.values.code || ''
    if (!code) { do { code = `IMP${String(next++).padStart(5, '0')}` } while (used.has(code)); used.add(code) }
    let id: string
    do { id = `import:row:${nextId++}` } while (ids.has(id))
    ids.add(id)
    return { id, code, name: row.values.name || '(거래처명 없음)', registration: row.values.registration!, contact: row.values.phone || row.values.mobile || '—', status: row.errors.length || row.warnings.length ? '확인요망' : '거래 중', amount: '', date: '—', information: { ...row.values, code }, importIssues: [...row.errors, ...row.warnings], sourceLine: row.line }
  })
}
