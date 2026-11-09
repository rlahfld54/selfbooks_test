import { defineTabSession } from '~/composables/useTabSession'
import { createTableViewState } from '~/types/table'

export const partnerListSession = defineTabSession(() => ({ query: '', table: createTableViewState() }))

