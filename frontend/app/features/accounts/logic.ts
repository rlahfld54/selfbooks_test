import { accountCategories } from './types.ts'
import type { MockAccount, MockSummary } from './types.ts'
export function filterAccounts(accounts: MockAccount[], query: string, category: string, subcategory: string, active: string) {
  const search = query.trim().toLowerCase()
  return accounts.filter(a => (!search || (a.code + ' ' + a.name).toLowerCase().includes(search))
    && (!category || a.category === category) && (!subcategory || a.subcategory === subcategory)
    && (!active || String(a.isActive) === active))
}
export function validateAccount(value: MockAccount, rows: MockAccount[]) {
  if (!value.code.trim() || !value.name.trim()) return '계정코드와 계정과목명을 입력하세요.'
  if (rows.some(a => a.id !== value.id && a.code === value.code.trim())) return '이미 사용 중인 계정코드입니다.'
  const categories = accountCategories(rows)
  if (!Object.hasOwn(categories, value.category)) return '대분류를 선택하세요.'
  const children = categories[value.category]!
  const keepsEmptySubcategory = !value.subcategory && rows.some(row => row.id === value.id && row.category === value.category && !row.subcategory)
  if (children.length && !children.includes(value.subcategory) && !keepsEmptySubcategory) return '대분류에 맞는 중분류를 선택하세요.'
  return ''
}
export function validateSummary(value: MockSummary, rows: MockSummary[], accounts: MockAccount[]) {
  if (!value.code.trim() || !value.name.trim()) return '적요코드와 적요명을 입력하세요.'
  if (!accounts.some(a => a.id === value.accountId)) return '연결 계정과목을 선택하세요.'
  if (rows.some(s => s.id !== value.id && s.code === value.code.trim())) return '이미 사용 중인 적요코드입니다.'
  return ''
}


