import { computed, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '~/stores/authStore'
export const optionalColumns = [
  'category',
  'subcategory',
  'attribute',
  'relatedAccount',
  'side',
] as const
export function useAccountPreferences() {
  const auth = useAuthStore()
  const key = computed(
    () =>
      'selfbooks:accounts:preferences:v1:' +
      (auth.user?.officeId ?? 'preview') +
      ':' +
      (auth.user?.id ?? 'preview'),
  )
  const preferences = ref({ columns: [] as string[], compact: false, matrix: false })
  let ready = false
  function restore() {
    ready = false
    preferences.value = { columns: [], compact: false, matrix: false }
    try {
      const v = JSON.parse(localStorage.getItem(key.value) || '{}')
      preferences.value = {
        columns: Array.isArray(v.columns)
          ? v.columns.filter((c: string) =>
              optionalColumns.includes(c as (typeof optionalColumns)[number]),
            )
          : [],
        compact: v.compact === true,
        matrix: v.matrix === true,
      }
    } catch {
      /* Invalid or unavailable storage: defaults. */
    }
    ready = true
  }
  onMounted(restore)
  watch(key, restore)
  watch(
    preferences,
    (v) => {
      if (ready) {
        try {
          localStorage.setItem(key.value, JSON.stringify(v))
        } catch {
          /* Session settings remain usable. */
        }
      }
    },
    { deep: true, flush: 'sync' },
  )
  return { preferences }
}
