import { defineTabSession } from '~/composables/useTabSession'
import { emptyDraft, type SalesRecord } from '../services/salesJournal'
export const salesJournalSession = defineTabSession(() => ({
  initialized: false,
  rows: [] as SalesRecord[],
  draft: emptyDraft(),
  selected: '',
  filter: { from: '', to: '', type: '', query: '' },
  applied: { from: '', to: '', type: '', query: '' },
}))
