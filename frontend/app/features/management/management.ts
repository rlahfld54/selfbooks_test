import type { Client, Staff } from './data'
export function filterClients(rows: Client[], query: string, biz: string, type: string, status: string, person: string, review: string) {
  const normalized = biz.replace(/\D/g, '')
  return rows.filter(row => row.name.toLowerCase().includes(query.trim().toLowerCase())
    && row.biz.replace(/\D/g, '').includes(normalized)
    && (!type || row.type === type) && (!status || row.status === status)
    && (!person || row.primary === person || row.secondary.includes(person))
    && (!review || row.company === review || row.environment === review))
}
export function assignedPeople(staff: Staff[], primary: string, secondary: string[]) {
  const active = new Set(staff.filter(person => person.status === '활성').map(person => person.name))
  if (!active.has(primary)) throw new Error('활성 직원 중 주담당자를 선택해 주세요.')
  return { primary, secondary: [...new Set(secondary)].filter(name => name !== primary && active.has(name)) }
}
