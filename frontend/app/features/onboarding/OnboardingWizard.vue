<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useOnboarding } from './useOnboarding'
import { steps } from './mocks'
import type { Client } from './types'
import OfficeInfoStep from './OfficeInfoStep.vue'
import UserPermissionStep from './UserPermissionStep.vue'
import BusinessSettingsStep from './BusinessSettingsStep.vue'
import ClientRegistrationStep from './ClientRegistrationStep.vue'
import SetupSummaryStep from './SetupSummaryStep.vue'
import OnboardingStepNavigation from './OnboardingStepNavigation.vue'
import OnboardingProgress from './OnboardingProgress.vue'
import './onboarding.css'
const { data, open, error, message, storageWarning, go, finish, reset, launch, save } = useOnboarding()
const dialog = ref<HTMLDialogElement>()
const resetConfirm = ref(false)
let previous: HTMLElement | null = null
let overflow = ''
watch(open, async value => {
  await nextTick()
  if (value && dialog.value && !dialog.value.open) {
    previous = document.activeElement as HTMLElement
    overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.value.showModal()
    dialog.value.querySelector<HTMLElement>('.ob-close')?.focus()
  } else if (!value && dialog.value?.open) {
    dialog.value.close(); document.body.style.overflow = overflow; previous?.focus()
  }
})
watch(() => data.value.step, async () => { await nextTick(); dialog.value?.querySelector('.ob-content')?.scrollTo(0, 0) })
onBeforeUnmount(() => { if (dialog.value?.open) { dialog.value.close(); document.body.style.overflow = overflow } })
function saveClient(client: Client) { const index = data.value.clients.findIndex(c => c.id === client.id); if (index < 0) data.value.clients.push(client); else data.value.clients[index] = client }
function skip() { open.value = false; message.value = '설정을 잠시 건너뛰었습니다. 시작 가이드에서 이어서 설정할 수 있습니다.' }
</script>
<template>
  <UiButton @click="launch"><span class="ob-launch-icon" aria-hidden="true">↗</span>시작 가이드</UiButton>
  <Teleport to="body">
    <div v-if="message && !open" class="ob-toast" role="status">{{ message }}<UiButton variant="ghost" aria-label="알림 닫기" @click="message = ''"><UiIcon name="close" :size="16" /></UiButton></div>
    <dialog ref="dialog" class="ob-dialog" aria-labelledby="ob-title" aria-describedby="ob-description" @cancel.prevent="open = false">
      <header class="ob-header"><div class="ob-rocket" aria-hidden="true"><svg viewBox="0 0 64 64" fill="none"><path d="M22 31 12 32l-5 14 16-3M33 43l-1 13 14-6 1-13" fill="#83adff"/><path d="M19 37C27 18 40 9 57 8c-1 18-10 31-29 39z" fill="#2463eb"/><path d="m19 44-7 13 14-7" fill="#b6ceff"/><circle cx="43" cy="23" r="7" fill="white"/><path d="m19 37 9 10" stroke="#124dbd" stroke-width="4"/></svg></div><div><p class="ob-eyebrow">AAT <strong>시작 가이드</strong></p><h2 id="ob-title">간단한 초기 설정으로 업무를 시작해 보세요.</h2><p id="ob-description">세무사사무소의 기본정보와 업무 환경을 순서대로 설정하면, 바로 업무를 시작할 수 있습니다.</p></div><UiButton class="ob-close" variant="ghost" aria-label="환경설정 닫기" @click="open = false"><UiIcon name="close" /></UiButton></header>
      <div class="ob-body"><OnboardingStepNavigation :step="data.step" @go="go" /><main class="ob-content">
        <OnboardingProgress :step="data.step" />
        <div class="ob-step-title"><span><UiIcon :name="steps[data.step - 1]?.icon" :size="25" /></span><div><h3>{{ steps[data.step - 1]?.title }}</h3><p>{{ data.step === 1 ? '세무사사무소의 기본정보를 입력해 주세요.' : steps[data.step - 1]?.description }}</p></div></div>
        <p v-if="error" class="ob-error" role="alert">{{ error }}</p>
        <p v-if="storageWarning" class="ob-error" role="status">{{ storageWarning }}</p>
        <p v-if="message" class="ob-feedback" role="status">{{ message }}</p>
        <OfficeInfoStep v-if="data.step === 1" :office="data.office" />
        <UserPermissionStep v-else-if="data.step === 2" :staff="data.staff" @add="data.staff.push($event)" @remove="data.staff = data.staff.filter(s => s.id !== $event)" />
        <BusinessSettingsStep v-else-if="data.step === 3" :settings="data.settings" />
        <ClientRegistrationStep v-else-if="data.step === 4" :clients="data.clients" @save="saveClient" @remove="data.clients = data.clients.filter(c => c.id !== $event)" @skip="go(5)" />
        <SetupSummaryStep v-else :data="data" @edit="go" />
        <div class="ob-test-tools"><span>UI 테스트 모드 · 이 브라우저에만 저장</span><button @click="data.step = 1; error = ''">다시 시작</button><button @click="resetConfirm = true">테스트 데이터 초기화</button></div>
      </main></div>
      <footer class="ob-footer"><UiButton @click="save"><UiIcon name="document" :size="17" />임시 저장</UiButton><UiButton variant="ghost" class="ob-skip" @click="skip">설정 건너뛰기</UiButton><div class="ob-footer-right"><UiButton :disabled="data.step === 1" @click="go(data.step - 1)">이전</UiButton><UiButton v-if="data.step < 5" variant="primary" @click="go(data.step + 1)">다음 단계 <UiIcon name="arrow" :size="18" /></UiButton><UiButton v-else variant="primary" @click="finish">설정 완료 <UiIcon name="check" :size="18" /></UiButton></div></footer>
    </dialog>
  </Teleport>
  <UiModal :open="resetConfirm" title="테스트 데이터 초기화" @close="resetConfirm = false"><p>입력한 테스트 설정을 지우고 기본 샘플 데이터와 최초 방문 상태로 되돌립니다.</p><template #footer><UiButton @click="resetConfirm = false">취소</UiButton><UiButton variant="primary" @click="resetConfirm = false; reset()">초기화</UiButton></template></UiModal>
</template>
