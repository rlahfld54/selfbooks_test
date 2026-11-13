export type RegistrationReview = {
  values: Record<string, string>
  original: Record<string, string>
  reviewed: Record<string, boolean>
  needsReview: Record<string, boolean>
}

export function createRegistrationReview(): RegistrationReview {
  return { values: {}, original: {}, reviewed: {}, needsReview: {} }
}

export function editRegistrationField(state: RegistrationReview, section: string, field: string, value: string) {
  if ((state.values[field] ?? '') === value) return false
  state.values[field] = value
  if (state.reviewed[section]) state.needsReview[section] = true
  state.reviewed[section] = false
  return true
}

export function confirmRegistrationSection(state: RegistrationReview, section: string, confirmed: boolean) {
  state.reviewed[section] = confirmed
  if (confirmed) state.needsReview[section] = false
}
