import data from './referenceData.json'
import { summarySide } from './types'
import type { MockAccount, MockSummary } from './types'

// Supplied developer HTML, f3. Preview fixtures only; never mixed into live client data.
export function createReferenceAccounting() {
  const accounts: MockAccount[] = data.ACCOUNTS.map((a) => {
    const group = data.MIDCATS.find((m) => {
      const [min, max] = m.range.split('~').map(Number)
      return a.code >= min! && a.code <= max!
    })
    return {
      id: a.code,
      code: String(a.code),
      name: a.name,
      displayName: a.name,
      category: a.code >= 1000 ? '특수설정계정과목' : a.nature,
      subcategory: group?.mid ?? '',
      balanceSide: a.nature === '자산' || a.nature === '비용' ? 'DEBIT' : 'CREDIT',
      isActive: true,
      isLocked: a.code < 1000,
      attribute: a.attr ?? '',
      relatedAccount: a.relcode == null ? '' : String(a.relcode),
    }
  })
  const summaries: MockSummary[] = data.DESCS.map((d) => ({
    id: d.code,
    code: String(d.code),
    accountId: d.acode,
    name: d.name,
    side: summarySide(d.ttype ? parseInt(d.ttype) : null, d.name),
    transactionElementCode: d.ttype ? parseInt(d.ttype) : null,
    kind: d.kind,
    isFixed: d.kind === '고정적요',
    isActive: true,
    canExclude: d.hasCheckbox,
    excluded: false,
    note: d.note ?? '',
    isNew: d.tag1 === '거래수단적요',
  }))
  return { accounts, summaries }
}
