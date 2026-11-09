import { defineTabSession } from '~/composables/useTabSession'

export const gallerySession = defineTabSession(() => ({
  text: '', amount: '1500000', number: '12', checked: false, radio: 'a',
  select: 'a', start: '2026-11-01', end: '2026-11-30',
}))

