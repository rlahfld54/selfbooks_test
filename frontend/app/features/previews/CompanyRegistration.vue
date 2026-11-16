<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useBackendApi } from '~/composables/useBackendApi'
import {
  applyOfficeRegistration,
  previewOfficeRegistration,
  type OfficeRegistration,
} from './officeRegistrationData'
import {
  formatBusinessNumber,
  formatCorporationNumber,
  formatPhoneNumber,
} from '~/utils/number-validation'
import { ApiRequestError } from '~/services/api-client'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { companyRegistrationSession } from './registrationSession'
import { editRegistrationField, confirmRegistrationSection } from './registrationReview'
const { activeTab, navigate, setDirty } = useWorkspaceContext()
const session = companyRegistrationSession(activeTab.value)
const { pagesPreview } = useRuntimeConfig().public
const request = useBackendApi()
const loading = ref(false)
const error = ref('')
const controller = new AbortController()
async function load() {
  if (session.loaded || loading.value) return
  loading.value = true
  error.value = ''
  try {
    const data = pagesPreview
      ? previewOfficeRegistration
      : (await request<OfficeRegistration>('/office-registration', controller.signal)).data
    if (controller.signal.aborted) return
    applyOfficeRegistration(session, data)
    session.officeName = data.name ?? ''
    session.loaded = true
  } catch (failure) {
    if (!controller.signal.aborted) {
      error.value =
        failure instanceof ApiRequestError
          ? failure.message
          : '사무소 정보를 불러오지 못했습니다. 다시 조회해 주세요.'
    }
  } finally {
    loading.value = false
  }
}
onMounted(load)
onBeforeUnmount(() => controller.abort())
const completed = computed(
  () =>
    ['기본정보', '대표자정보', '사업장정보', '세무정보', '첨부/메모'].filter(
      (section) => session.reviewed[section],
    ).length,
)
function edit(section: string, field: string, value: string) {
  if (editRegistrationField(session, section, field, value)) setDirty(activeTab.value)
}
function confirm(section: string, value: boolean) {
  confirmRegistrationSection(session, section, value)
  setDirty(activeTab.value)
}
</script>

<template>
  <div>
    <PageToolbar
      title="회사등록"
      description="수집된 회사정보를 위에서부터 검토하고 필요한 내용을 수정하세요."
    >
      <template #eyebrow>기초정보관리</template>
      <UiBadge tone="neutral">정보 검토 및 수정</UiBadge>
      <UiButton @click="navigate('clients')">수임업체 목록 조회</UiButton>
    </PageToolbar>
    <div v-if="error" role="alert">
      <p>{{ error }}</p>
      <UiButton @click="load">다시 조회</UiButton>
    </div>
    <div v-if="session.loaded" class="review-form">
      <UiCard title="기본정보">
        <template #actions>
          <UiBadge :tone="session.reviewed['기본정보'] ? 'success' : 'neutral'">
            <span v-if="session.reviewed['기본정보']">검토 확인</span>
            <span v-else-if="session.needsReview['기본정보']">재검토 필요</span>
            <span v-else>검토 대기</span>
          </UiBadge>
        </template>
        <div class="review-fields">
          <div class="review-field">
            <FormField id="company-field-0-0" label="회사명">
              <UiInput
                id="company-field-0-0"
                :model-value="session.values['회사명']"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('기본정보', '회사명', $event)"
              />
            </FormField>
          </div>
          <div class="review-field">
            <FormField id="company-field-0-1" label="사업자등록번호">
              <UiInput
                id="company-field-0-1"
                :model-value="formatBusinessNumber(session.values['사업자등록번호'])"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('기본정보', '사업자등록번호', $event)"
              />
            </FormField>
          </div>
          <div class="review-field">
            <FormField id="company-field-0-2" label="법인등록번호">
              <UiInput
                id="company-field-0-2"
                :model-value="formatCorporationNumber(session.values['법인등록번호'])"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('기본정보', '법인등록번호', $event)"
              />
            </FormField>
          </div>
          <div class="review-field">
            <FormField id="company-field-0-3" label="주소">
              <UiInput
                id="company-field-0-3"
                :model-value="session.values['주소']"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('기본정보', '주소', $event)"
              />
            </FormField>
          </div>
          <div class="review-field">
            <FormField id="company-field-0-4" label="업태">
              <UiInput
                id="company-field-0-4"
                :model-value="session.values['업태']"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('기본정보', '업태', $event)"
              />
            </FormField>
          </div>
          <div class="review-field">
            <FormField id="company-field-0-5" label="종목">
              <UiInput
                id="company-field-0-5"
                :model-value="session.values['종목']"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('기본정보', '종목', $event)"
              />
            </FormField>
          </div>
        </div>
      </UiCard>
      <UiCard title="대표자정보">
        <template #actions>
          <UiBadge :tone="session.reviewed['대표자정보'] ? 'success' : 'neutral'">
            <span v-if="session.reviewed['대표자정보']">검토 확인</span>
            <span v-else-if="session.needsReview['대표자정보']">재검토 필요</span>
            <span v-else>검토 대기</span>
          </UiBadge>
        </template>
        <div class="review-fields">
          <div class="review-field">
            <FormField id="company-field-1-0" label="대표자명">
              <UiInput
                id="company-field-1-0"
                :model-value="session.values['대표자명']"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('대표자정보', '대표자명', $event)"
              />
            </FormField>
          </div>
          <div class="review-field">
            <FormField id="company-field-1-1" label="공동대표자">
              <UiInput
                id="company-field-1-1"
                :model-value="session.values['공동대표자']"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('대표자정보', '공동대표자', $event)"
              />
            </FormField>
          </div>
          <div class="review-field">
            <FormField id="company-field-1-2" label="연락처">
              <UiInput
                id="company-field-1-2"
                :model-value="formatPhoneNumber(session.values['연락처'])"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('대표자정보', '연락처', $event)"
              />
            </FormField>
          </div>
        </div>
      </UiCard>
      <UiCard title="사업장정보">
        <template #actions>
          <UiBadge :tone="session.reviewed['사업장정보'] ? 'success' : 'neutral'">
            <span v-if="session.reviewed['사업장정보']">검토 확인</span>
            <span v-else-if="session.needsReview['사업장정보']">재검토 필요</span>
            <span v-else>검토 대기</span>
          </UiBadge>
        </template>
        <div class="review-fields">
          <div class="review-field">
            <FormField id="company-field-2-0" label="본점">
              <UiInput
                id="company-field-2-0"
                :model-value="session.values['본점']"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('사업장정보', '본점', $event)"
              />
            </FormField>
          </div>
          <div class="review-field">
            <FormField id="company-field-2-1" label="지점">
              <UiInput
                id="company-field-2-1"
                :model-value="session.values['지점']"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('사업장정보', '지점', $event)"
              />
            </FormField>
          </div>
          <div class="review-field">
            <FormField id="company-field-2-2" label="추가사업장">
              <UiInput
                id="company-field-2-2"
                :model-value="session.values['추가사업장']"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('사업장정보', '추가사업장', $event)"
              />
            </FormField>
          </div>
        </div>
      </UiCard>
      <UiCard title="세무정보">
        <template #actions>
          <UiBadge :tone="session.reviewed['세무정보'] ? 'success' : 'neutral'">
            <span v-if="session.reviewed['세무정보']">검토 확인</span>
            <span v-else-if="session.needsReview['세무정보']">재검토 필요</span>
            <span v-else>검토 대기</span>
          </UiBadge>
        </template>
        <div class="review-fields">
          <div class="review-field">
            <FormField id="company-field-3-0" label="과세유형">
              <UiInput
                id="company-field-3-0"
                :model-value="session.values['과세유형']"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('세무정보', '과세유형', $event)"
              />
            </FormField>
          </div>
          <div class="review-field">
            <FormField id="company-field-3-1" label="관할세무서">
              <UiInput
                id="company-field-3-1"
                :model-value="session.values['관할세무서']"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('세무정보', '관할세무서', $event)"
              />
            </FormField>
          </div>
          <div class="review-field">
            <FormField id="company-field-3-2" label="담당자">
              <UiInput
                id="company-field-3-2"
                :model-value="session.values['담당자']"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('세무정보', '담당자', $event)"
              />
            </FormField>
          </div>
          <div class="review-field">
            <FormField id="company-field-3-3" label="환급계좌">
              <UiInput
                id="company-field-3-3"
                :model-value="session.values['환급계좌']"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('세무정보', '환급계좌', $event)"
              />
            </FormField>
          </div>
        </div>
      </UiCard>
      <UiCard title="첨부/메모">
        <template #actions>
          <UiBadge :tone="session.reviewed['첨부/메모'] ? 'success' : 'neutral'">
            <span v-if="session.reviewed['첨부/메모']">검토 확인</span>
            <span v-else-if="session.needsReview['첨부/메모']">재검토 필요</span>
            <span v-else>검토 대기</span>
          </UiBadge>
        </template>
        <div class="review-fields">
          <div class="review-field">
            <FormField id="company-field-4-0" label="업무메모">
              <UiInput
                id="company-field-4-0"
                :model-value="session.values['업무메모']"
                placeholder="수집 정보가 없으면 직접 입력하세요"
                @update:model-value="edit('첨부/메모', '업무메모', $event)"
              />
            </FormField>
          </div>
        </div>
        <p class="muted">사업자등록증·계약서 첨부는 파일 저장 기능 연결 후 제공됩니다.</p>
      </UiCard>
    </div>
    <div class="section-switcher section-gap" aria-label="최초 설정 안내">
      <span>다음 설정</span><UiButton @click="navigate('settings')">환경등록</UiButton
      ><UiButton @click="navigate('accounts')">계정과목 및 적요관리</UiButton>
    </div>
  </div>
</template>

<style scoped>
.review-form,
.review-fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.review-summary {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
}
.review-fields {
  max-width: 880px;
}
.review-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.review-field small {
  overflow-wrap: anywhere;
}
.review-confirm {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}
</style>
