import { defineTabSession } from '~/composables/useTabSession'
import { createTableViewState } from '~/types/table'
export const directorySession = defineTabSession(() => ({ query: '', selectedId: '', table: createTableViewState() }))

