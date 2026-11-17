<script setup lang="ts">
import type { ManagementRows } from '../view-types'

import ManagementEditActions from './ManagementEditActions.vue'
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
function updateField(key: string, event: Event) {
  if (event instanceof InputEvent && event.isComposing) return
  emit('field', key, (event.target as HTMLInputElement | HTMLSelectElement).value)
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
          <label v-if="editing" for="org-사업자 정보0">회계법인명/사무소명</label>
          <input
            v-if="editing"
            id="org-사업자 정보0"
            :value="form['회계법인명/사무소명']"
            @input="updateField('회계법인명/사무소명', $event)"
            @compositionend="updateField('회계법인명/사무소명', $event)"
          />
          <template v-else>
            <span class="field-label">회계법인명/사무소명</span>
            <div class="display">{{ rows.organization['회계법인명/사무소명'] || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-사업자 정보1">사업자등록번호</label>
          <input
            v-if="editing"
            id="org-사업자 정보1"
            :value="form['사업자등록번호']"
            @input="updateField('사업자등록번호', $event)"
            @compositionend="updateField('사업자등록번호', $event)"
          />
          <template v-else>
            <span class="field-label">사업자등록번호</span>
            <div class="display">{{ rows.organization['사업자등록번호'] || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-사업자 정보2">법인등록번호</label>
          <input
            v-if="editing"
            id="org-사업자 정보2"
            :value="form['법인등록번호']"
            @input="updateField('법인등록번호', $event)"
            @compositionend="updateField('법인등록번호', $event)"
          />
          <template v-else>
            <span class="field-label">법인등록번호</span>
            <div class="display">{{ rows.organization['법인등록번호'] || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-사업자 정보3">대표자명</label>
          <input
            v-if="editing"
            id="org-사업자 정보3"
            :value="form['대표자명']"
            @input="updateField('대표자명', $event)"
            @compositionend="updateField('대표자명', $event)"
          />
          <template v-else>
            <span class="field-label">대표자명</span>
            <div class="display">{{ rows.organization['대표자명'] || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-사업자 정보4">사업장 주소</label>
          <input
            v-if="editing"
            id="org-사업자 정보4"
            :value="form['사업장 주소']"
            @input="updateField('사업장 주소', $event)"
            @compositionend="updateField('사업장 주소', $event)"
          />
          <template v-else>
            <span class="field-label">사업장 주소</span>
            <div class="display">{{ rows.organization['사업장 주소'] || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-사업자 정보5">업태</label>
          <input
            v-if="editing"
            id="org-사업자 정보5"
            :value="form['업태']"
            @input="updateField('업태', $event)"
            @compositionend="updateField('업태', $event)"
          />
          <template v-else>
            <span class="field-label">업태</span>
            <div class="display">{{ rows.organization['업태'] || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-사업자 정보6">종목</label>
          <input
            v-if="editing"
            id="org-사업자 정보6"
            :value="form['종목']"
            @input="updateField('종목', $event)"
            @compositionend="updateField('종목', $event)"
          />
          <template v-else>
            <span class="field-label">종목</span>
            <div class="display">{{ rows.organization['종목'] || '—' }}</div>
          </template>
        </div>
      </div>
    </section>
    <section class="panel info-section">
      <h3>연락처 정보</h3>
      <div :class="editing ? 'form-grid' : 'group-grid'">
        <div class="field">
          <label v-if="editing" for="org-연락처 정보0">대표전화</label>
          <input
            v-if="editing"
            id="org-연락처 정보0"
            :value="form['대표전화']"
            @input="updateField('대표전화', $event)"
            @compositionend="updateField('대표전화', $event)"
          />
          <template v-else>
            <span class="field-label">대표전화</span>
            <div class="display">{{ rows.organization['대표전화'] || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-연락처 정보1">대표 이메일</label>
          <input
            v-if="editing"
            id="org-연락처 정보1"
            :value="form['대표 이메일']"
            @input="updateField('대표 이메일', $event)"
            @compositionend="updateField('대표 이메일', $event)"
          />
          <template v-else>
            <span class="field-label">대표 이메일</span>
            <div class="display">{{ rows.organization['대표 이메일'] || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-연락처 정보2">팩스번호</label>
          <input
            v-if="editing"
            id="org-연락처 정보2"
            :value="form['팩스번호']"
            @input="updateField('팩스번호', $event)"
            @compositionend="updateField('팩스번호', $event)"
          />
          <template v-else>
            <span class="field-label">팩스번호</span>
            <div class="display">{{ rows.organization['팩스번호'] || '—' }}</div>
          </template>
        </div>
      </div>
    </section>
    <section class="panel info-section">
      <h3>세무대리 관련 정보</h3>
      <div :class="editing ? 'form-grid' : 'group-grid'">
        <div class="field">
          <label v-if="editing" for="org-세무대리 관련 정보0">세무대리인 관리번호</label>
          <input
            v-if="editing"
            id="org-세무대리 관련 정보0"
            :value="form['세무대리인 관리번호']"
            @input="updateField('세무대리인 관리번호', $event)"
            @compositionend="updateField('세무대리인 관리번호', $event)"
          />
          <template v-else>
            <span class="field-label">세무대리인 관리번호</span>
            <div class="display">{{ rows.organization['세무대리인 관리번호'] || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-세무대리 관련 정보1">사무소 구분</label>
          <input
            v-if="editing"
            id="org-세무대리 관련 정보1"
            :value="form['사무소 구분']"
            @input="updateField('사무소 구분', $event)"
            @compositionend="updateField('사무소 구분', $event)"
          />
          <template v-else>
            <span class="field-label">사무소 구분</span>
            <div class="display">{{ rows.organization['사무소 구분'] || '—' }}</div>
          </template>
        </div>
        <div class="field">
          <label v-if="editing" for="org-세무대리 관련 정보2">기타 등록정보</label>
          <input
            v-if="editing"
            id="org-세무대리 관련 정보2"
            :value="form['기타 등록정보']"
            @input="updateField('기타 등록정보', $event)"
            @compositionend="updateField('기타 등록정보', $event)"
          />
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
