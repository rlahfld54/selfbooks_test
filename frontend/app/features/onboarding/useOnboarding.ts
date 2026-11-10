import { ref, onMounted, watch } from 'vue'
import { createOnboardingData } from './mocks'
import { isOnboardingData, validateStep } from './validation'
import { useMockAuth } from '~/features/auth/useMockAuth'
export const ONBOARDING_KEY = 'accounting-pro:onboarding-demo:v1'
export function useOnboarding() {
  const { user, restore } = useMockAuth()
  let storageKey = ONBOARDING_KEY
  const data = ref(createOnboardingData())
  const open = ref(false)
  const error = ref('')
  const message = ref('')
  const storageWarning = ref('')
  let ready = false
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(data.value)); storageWarning.value = '' }
    catch { storageWarning.value = '브라우저 저장소를 사용할 수 없어 현재 화면에서만 유지됩니다.' }
  }
  onMounted(() => {
    restore()
    // Preserve the existing guest/admin demo; new users have their own setup state.
    if (user.value && user.value.id !== 'demo-admin') storageKey = `${ONBOARDING_KEY}:${user.value.id}`
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) { const parsed: unknown = JSON.parse(raw); if (isOnboardingData(parsed)) data.value = parsed; else storageWarning.value = '저장된 테스트 상태를 읽을 수 없어 기본값으로 시작합니다.' }
    } catch { storageWarning.value = '저장된 테스트 상태를 읽을 수 없어 기본값으로 시작합니다.' }
    ready = true
    open.value = !data.value.completed
  })
  watch(data, () => { if (ready) persist() }, { deep: true })
  function go(step: number) {
    error.value = step > data.value.step ? validateStep(data.value, data.value.step) : ''
    if (!error.value) data.value.step = Math.max(1, Math.min(5, step))
  }
  function finish() {
    for (let step = 1; step <= 4; step++) { const issue = validateStep(data.value, step); if (issue) { data.value.step = step; error.value = issue; return } }
    data.value.completed = true; persist(); open.value = false; message.value = '초기 설정이 완료되었습니다. 이제 업무를 시작해 보세요.'
  }
  function reset() { data.value = createOnboardingData(); error.value = ''; message.value = ''; persist(); open.value = true }
  function launch() { error.value = ''; message.value = ''; open.value = true }
  function save() { persist(); message.value = storageWarning.value || '입력한 설정을 이 브라우저에 임시 저장했습니다.' }
  return { data, open, error, message, storageWarning, go, finish, reset, launch, save }
}
