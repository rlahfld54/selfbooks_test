<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useAuthStore } from '~/stores/authStore'
import type { ManagementRows } from '../view-types'
import { formatNumber, type NumberFormat } from '~/utils/number-validation'

import ManagementEditActions from './ManagementEditActions.vue'

const authStore = useAuthStore()
const { userInfo } = storeToRefs(authStore)

defineProps<{
  rows: Pick<ManagementRows, 'organization'>
  form: Record<string, string>
  editing: boolean
}>()
const emit = defineEmits<{
  edit: []
  save: []
  cancel: []
  field: [key: string, value: string]
}>()
function updateField(key: string, event: Event, format?: NumberFormat) {
  if (event instanceof InputEvent && event.isComposing) return
  const value = (event.target as HTMLInputElement).value
  emit('field', key, format ? formatNumber(format, value) : value)
}
</script>

<template>
  <div class="section-heading">
    <div>
      <h3>조직 정보</h3>
      <p>수임업체 정보와 구분되는 회계법인 자체의 등록정보입니다.</p>
    </div>
    <button v-if="!editing" class="btn" @click="emit('edit')">✎ 수정하기</button>
  </div>
  <form @submit.prevent="emit('save')">
    <section class="panel info-section">
      <h3>사업자 정보</h3>
      <div :class="editing ? 'form-grid' : 'group-grid'">
        <div class="field">
          <label v-if="editing" for="org-name">회계법인명/사무소명</label>
          <input
            v-if="editing"
            id="org-name"
            :value="form['회계법인명/사무소명']"
            @input="updateField('회계법인명/사무소명', $event)"
            @compositionend="updateField('회계법인명/사무소명', $event)" />
          <template v-else>
            <span class="field-label">회계법인명/사무소명</span>
            <div class="display">{{ userInfo?.organization?.name || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-business-number">사업자등록번호</label>
          <input
            v-if="editing"
            id="org-business-number"
            :value="form['사업자등록번호']"
            @input="updateField('사업자등록번호', $event)"
            @compositionend="updateField('사업자등록번호', $event)"
            @blur="updateField('사업자등록번호', $event, 'business')" />
          <template v-else>
            <span class="field-label">사업자등록번호</span>
            <div class="display">
              {{ formatNumber('business', userInfo?.organization?.business_registration_number) || '—' }}
            </div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-corporate-number">법인등록번호</label>
          <input
            v-if="editing"
            id="org-corporate-number"
            :value="form['법인등록번호']"
            @input="updateField('법인등록번호', $event)"
            @compositionend="updateField('법인등록번호', $event)"
            @blur="updateField('법인등록번호', $event, 'corporation')" />
          <template v-else>
            <span class="field-label">법인등록번호</span>
            <div class="display">
              {{ formatNumber('corporation', userInfo?.organization?.corporate_registration_number) || '—' }}
            </div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-representative">대표자명</label>
          <input
            v-if="editing"
            id="org-representative"
            :value="form['대표자명']"
            @input="updateField('대표자명', $event)"
            @compositionend="updateField('대표자명', $event)" />
          <template v-else>
            <span class="field-label">대표자명</span>
            <div class="display">{{ userInfo?.organization?.representative_name || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-address">사업장 주소</label>
          <input
            v-if="editing"
            id="org-address"
            :value="form['사업장 주소']"
            @input="updateField('사업장 주소', $event)"
            @compositionend="updateField('사업장 주소', $event)" />
          <template v-else>
            <span class="field-label">사업장 주소</span>
            <div class="display">{{ userInfo?.organization?.address || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-business-type">업태</label>
          <input
            v-if="editing"
            id="org-business-type"
            :value="form['업태']"
            @input="updateField('업태', $event)"
            @compositionend="updateField('업태', $event)" />
          <template v-else>
            <span class="field-label">업태</span>
            <div class="display">{{ userInfo?.organization?.business_type || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-business-item">종목</label>
          <input
            v-if="editing"
            id="org-business-item"
            :value="form['종목']"
            @input="updateField('종목', $event)"
            @compositionend="updateField('종목', $event)" />
          <template v-else>
            <span class="field-label">종목</span>
            <div class="display">{{ userInfo?.organization?.business_item || '—' }}</div>
          </template>
        </div>
      </div>
    </section>
    <section class="panel info-section">
      <h3>연락처 정보</h3>
      <div :class="editing ? 'form-grid' : 'group-grid'">
        <div class="field">
          <label v-if="editing" for="org-phone">대표전화</label>
          <input
            v-if="editing"
            id="org-phone"
            :value="form['대표전화']"
            @input="updateField('대표전화', $event)"
            @compositionend="updateField('대표전화', $event)"
            @blur="updateField('대표전화', $event, 'phone')" />
          <template v-else>
            <span class="field-label">대표전화</span>
            <div class="display">{{ formatNumber('phone', userInfo?.organization?.phone) || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-email">대표 이메일</label>
          <input
            v-if="editing"
            id="org-email"
            :value="form['대표 이메일']"
            @input="updateField('대표 이메일', $event)"
            @compositionend="updateField('대표 이메일', $event)" />
          <template v-else>
            <span class="field-label">대표 이메일</span>
            <div class="display">{{ userInfo?.organization?.email || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-fax">팩스번호</label>
          <input
            v-if="editing"
            id="org-fax"
            :value="form['팩스번호']"
            @input="updateField('팩스번호', $event)"
            @compositionend="updateField('팩스번호', $event)"
            @blur="updateField('팩스번호', $event, 'phone')" />
          <template v-else>
            <span class="field-label">팩스번호</span>
            <div class="display">{{ formatNumber('phone', rows.organization['팩스번호']) || '—' }}</div>
          </template>
        </div>
      </div>
    </section>
    <section class="panel info-section">
      <h3>세무대리 관련 정보</h3>
      <div :class="editing ? 'form-grid' : 'group-grid'">
        <div class="field">
          <label v-if="editing" for="org-agent-number">세무대리인 관리번호</label>
          <input
            v-if="editing"
            id="org-agent-number"
            :value="form['세무대리인 관리번호']"
            @input="updateField('세무대리인 관리번호', $event)"
            @compositionend="updateField('세무대리인 관리번호', $event)" />
          <template v-else>
            <span class="field-label">세무대리인 관리번호</span>
            <div class="display">{{ rows.organization['세무대리인 관리번호'] || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-office-kind">사무소 구분</label>
          <input
            v-if="editing"
            id="org-office-kind"
            :value="form['사무소 구분']"
            @input="updateField('사무소 구분', $event)"
            @compositionend="updateField('사무소 구분', $event)" />
          <template v-else>
            <span class="field-label">사무소 구분</span>
            <div class="display">{{ rows.organization['사무소 구분'] || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-other">기타 등록정보</label>
          <input
            v-if="editing"
            id="org-other"
            :value="form['기타 등록정보']"
            @input="updateField('기타 등록정보', $event)"
            @compositionend="updateField('기타 등록정보', $event)" />
          <template v-else>
            <span class="field-label">기타 등록정보</span>
            <div class="display">{{ rows.organization['기타 등록정보'] || '—' }}</div>
          </template>
        </div>
      </div>
    </section>
    <ManagementEditActions v-if="editing" @cancel="emit('cancel')" />
  </form>
</template>
