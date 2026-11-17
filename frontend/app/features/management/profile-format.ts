import { formatPhoneNumber } from '../../utils/number-validation.ts'
import { normalizeEmail } from '../auth/validation.ts'

/** Existing profile editing is in-memory only; these do not update Auth or DB. */
export function formatProfileField(key: string, value: string | null | undefined): string {
  if (key === 'email') return normalizeEmail(value ?? '')
  if (key === 'phone') return formatPhoneNumber(value)
  if (key === 'name') return (value ?? '').trim()
  return value ?? ''
}
