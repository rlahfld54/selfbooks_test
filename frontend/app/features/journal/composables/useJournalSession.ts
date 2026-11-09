import { defineTabSession } from '~/composables/useTabSession'
import { createTableViewState } from '~/types/table'

export const journalSession = defineTabSession(() => ({
  draft: { date: '2026-11-09', memo: '', partner: '' },
  table: createTableViewState(),
}))

