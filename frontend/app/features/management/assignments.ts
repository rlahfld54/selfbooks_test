import type { Client, Staff } from './data'

export type DirectoryRole = 'OWNER' | 'ADMIN' | 'STAFF'
export interface DirectoryUser { id: string, name: string, email: string, role: string }
export const canManageClients = (role: string | undefined) => role === 'OWNER' || role === 'ADMIN'
export function assignmentRole(client: Client, userId: string) {
  if (!userId) {
    return ''
  }
  if (client.primaryId === userId) {
    return '주담당'
  }
  return client.secondaryIds?.includes(userId) ? '보조담당' : ''
}
export const needsReview = (client: Client) => ['검토 전', '검토 중'].includes(client.company) || ['검토 전', '검토 중'].includes(client.environment)
export function assignmentSummary(clients: Client[], userId: string) {
  const mine = clients.filter(client => assignmentRole(client, userId))
  return { total: mine.length, primary: mine.filter(client => assignmentRole(client, userId) === '주담당').length,
    secondary: mine.filter(client => assignmentRole(client, userId) === '보조담당').length,
    review: mine.filter(needsReview).length }
}
export function assignById(staff: Staff[], primaryId: string, secondaryIds: string[]) {
  const primary = staff.find(person => person.id === primaryId && person.status === '활성')
  if (!primary) {
    throw new Error('활성 직원 중 주담당자를 선택해 주세요.')
  }
  const assistants = [...new Set(secondaryIds)].filter(id => id !== primaryId && staff.some(person => person.id === id && person.status === '활성'))
  return { primaryId, secondaryIds: assistants, primary: primary.name,
    secondary: assistants.map(id => staff.find(person => person.id === id)!.name) }
}
export function canOpenClient(client: Client | undefined, user: DirectoryUser | null) {
  return !!client && !!user && (canManageClients(user.role) || (user.role === 'STAFF' && !!assignmentRole(client, user.id)))
}
