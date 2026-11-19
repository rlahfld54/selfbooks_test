import { defineStore } from 'pinia'

//선택 업체·연도
export const useWorkspaceStore = defineStore('workspace', () => {
  const selectedClientId = ref<number | null>(null)
  const selectedClientName = ref('')
  const fiscalYear = ref(new Date().getFullYear())

  function selectClient(id: number, name: string) {
    selectedClientId.value = id
    selectedClientName.value = name
  }

  function clearClient() {
    selectedClientId.value = null
    selectedClientName.value = ''
  }

  return {
    selectedClientId,
    selectedClientName,
    fiscalYear,
    selectClient,
    clearClient,
  }
})
