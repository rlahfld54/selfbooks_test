import type { MockAccount } from './types.ts'
export interface AccountDefaultRecord {
  sourceId: string; code: string; name: string; englishName: string | null
  categoryCode: string; subcategory: string | null; attribute: string | null
  normalBalance: 'D' | 'C'; relatedAccount: string | null; statementCode: string | null
  fxMethodCode: string; businessCar: boolean; isActive: boolean; isLocked: boolean
}
// Names confirmed by the user; unknown future codes are displayed verbatim.
const categoryNames: Record<string, string> = {
  '1': '자산', '2': '부채', '3': '자본', '4': '수익', '5': '비용', SPECIAL: '특수설정계정과목',
}
export function mapAccountDefaults(rows: AccountDefaultRecord[]): MockAccount[] {
  return rows.map((row, index) => {
    if (row.normalBalance !== 'D' && row.normalBalance !== 'C') throw new Error('계정 성격을 확인할 수 없습니다.')
    return {
      // Local UI identity only; bigint DB identifiers remain strings.
      id: index + 1, sourceId: row.sourceId, code: row.code, name: row.name,
      displayName: row.name, category: categoryNames[row.categoryCode] ?? row.categoryCode,
      subcategory: row.subcategory ?? '', balanceSide: row.normalBalance === 'D' ? 'DEBIT' : 'CREDIT',
      isActive: row.isActive, isLocked: row.isLocked, englishName: row.englishName ?? '',
      statementCode: row.statementCode ?? '', attribute: row.attribute ?? '',
      relatedAccount: row.relatedAccount ?? '', fxMethodCode: row.fxMethodCode, businessCar: row.businessCar,
    }
  })
}
