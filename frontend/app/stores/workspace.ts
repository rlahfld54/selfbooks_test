import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

// 선택 업체 · 회계연도
export const useWorkspaceStore = defineStore('workspace', () => {
  // State
  const selectedClientId = ref<number | null>(null)
  const selectedClientName = ref('')
  const fiscalYear = ref(new Date().getFullYear())

  // Getters
  const hasSelectedClient = computed(() => selectedClientId.value !== null)

  // Actions

  // 업체 선택
  function selectClient(id: number, name: string) {
    if (selectedClientId.value === id) return

    selectedClientId.value = id
    selectedClientName.value = name
    fiscalYear.value = new Date().getFullYear()
  }

  // 업체 선택 해제
  function clearClient() {
    selectedClientId.value = null
    selectedClientName.value = ''
    fiscalYear.value = new Date().getFullYear()
  }

  // 회계연도 직접 변경
  function setFiscalYear(year: number) {
    if (!Number.isInteger(year) || year < 1900 || year > 9999) {
      return false
    }

    fiscalYear.value = year
    return true
  }

  // 전기 / 차기
  function shiftFiscalYear(delta: -1 | 1) {
    return setFiscalYear(fiscalYear.value + delta)
  }

  return {
    // State
    selectedClientId,
    selectedClientName,
    fiscalYear,

    // Getters
    hasSelectedClient,

    // Actions
    selectClient,
    clearClient,
    setFiscalYear,
    shiftFiscalYear,
  }
})
