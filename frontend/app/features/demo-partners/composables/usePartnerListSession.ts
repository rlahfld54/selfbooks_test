import { defineTabSession } from '~/composables/useTabSession'
import { createTableViewState } from '~/types/table'
import type { ImportedPartner } from '../services/partnerImport'

export const partnerListSession = defineTabSession(() => ({ query: '', table: createTableViewState(), imported: [] as ImportedPartner[], loaded: false }))

