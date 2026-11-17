<script setup lang="ts">
import ManagementBadge from '../ManagementBadge.vue'
import type { ManagementRows } from '../view-types'

import ManagementEditActions from './ManagementEditActions.vue'
const props = defineProps<{
  rows: Pick<ManagementRows, 'person' | 'organization'>
  tab: string
  form: Record<string, string>
  editing: boolean
  editDisabled: boolean
  message: string
}>()
const organizationName = computed(() => props.rows.organization['회계법인명/사무소명'] || '—')
const emit = defineEmits<{
  edit: []
  save: []
  cancel: []
  field: [key: string, value: string]
  normalize: [key: string]
  open: [title: string]
  organization: []
}>()
function updateField(key: string, event: Event) {
  if (event instanceof InputEvent && event.isComposing) return
  emit('field', key, (event.target as HTMLInputElement | HTMLSelectElement).value)
}
</script>

<template>
  <template v-if="tab === 'info'">
    <div class="section-heading">
      <div>
        <h3>기본 정보</h3>
      </div>
      <button v-if="!editing" class="btn" :disabled="editDisabled" @click="emit('edit')">
        ✎ 정보 수정
      </button>
    </div>
    <form @submit.prevent="emit('save')">
      <div class="form-grid">
        <div class="field">
          <label for="profile-id">사용자 ID</label>
          <input id="profile-id" :value="rows.person.id" disabled />
        </div>
        <div class="field">
          <label for="profile-login">로그인 ID</label>
          <input id="profile-login" :value="rows.person.login" disabled />
        </div>
        <div class="field">
          <label for="profile-name">이름</label>
          <input
            v-if="editing"
            id="profile-name"
            :value="form['name']"
            @input="updateField('name', $event)"
            @compositionend="updateField('name', $event)"
            inputmode="text"
            @blur="emit('normalize', 'name')"
          />
          <input v-else id="profile-name" :value="rows.person.name" disabled />
        </div>
        <div class="field">
          <label for="profile-email">이메일</label>
          <input
            v-if="editing"
            id="profile-email"
            :value="form['email']"
            @input="updateField('email', $event)"
            @compositionend="updateField('email', $event)"
            inputmode="email"
            @blur="emit('normalize', 'email')"
          />
          <input v-else id="profile-email" :value="rows.person.email" disabled />
        </div>
        <div class="field">
          <label for="profile-phone">휴대전화</label>
          <input
            v-if="editing"
            id="profile-phone"
            :value="form['phone']"
            @input="updateField('phone', $event)"
            @compositionend="updateField('phone', $event)"
            inputmode="tel"
            @blur="emit('normalize', 'phone')"
          />
          <input v-else id="profile-phone" :value="rows.person.phone" disabled />
        </div>
        <div class="field">
          <label for="profile-office">소속 조직</label>
          <input id="profile-office" :value="organizationName" disabled />
        </div>
        <div class="field">
          <label for="profile-team">부서/팀</label>
          <input id="profile-team" :value="rows.person.team" disabled />
        </div>
        <div class="field">
          <label for="profile-title">직책</label>
          <input id="profile-title" :value="rows.person.title" disabled />
        </div>
        <div class="field">
          <label for="profile-role">시스템 권한</label>
          <input id="profile-role" :value="rows.person.role" disabled />
        </div>
      </div>
      <p v-if="editing && message" class="alert management-feedback" role="alert">
        {{ message }}
      </p>
      <ManagementEditActions v-if="editing" @cancel="emit('cancel')" />
    </form>
  </template>
  <template v-else-if="tab === 'organization'">
    <div class="section-heading">
      <div>
        <h3>소속 조직 정보</h3>
      </div>
      <button class="btn primary" @click="emit('organization')">조직 설정으로 이동 →</button>
    </div>
    <div class="two-col">
      <div>
        <div class="info-row">
          <span class="label">조직명</span>
          <span class="value">{{ organizationName }}</span>
        </div>
        <div class="info-row">
          <span class="label">사업자등록번호</span>
          <span class="value">{{ rows.organization['사업자등록번호'] || '—' }}</span>
        </div>
        <div class="info-row">
          <span class="label">대표자명</span>
          <span class="value">{{ rows.organization['대표자명'] || '—' }}</span>
        </div>
        <div class="info-row">
          <span class="label">대표전화</span>
          <span class="value">{{ rows.organization['대표전화'] || '—' }}</span>
        </div>
      </div>
      <div>
        <div class="info-row">
          <span class="label">대표 이메일</span>
          <span class="value">{{ rows.organization['대표 이메일'] || '—' }}</span>
        </div>
        <div class="info-row">
          <span class="label">사업장 주소</span>
          <span class="value">{{ rows.organization['사업장 주소'] || '—' }}</span>
        </div>
        <div class="info-row">
          <span class="label">소속 부서</span>
          <span class="value">{{ rows.person.team || '—' }}</span>
        </div>
        <div class="info-row">
          <span class="label">조직 내 역할</span>
          <span class="value"><ManagementBadge :value="rows.person.role || ''" /></span>
        </div>
      </div>
    </div>
  </template>
  <template v-else>
    <div class="section-heading">
      <div>
        <h3>계정 보안</h3>
        <p>로그인 정보와 기기 접근 상태를 확인합니다.</p>
      </div>
    </div>
    <div class="settings-row">
      <div>
        <b>비밀번호 변경</b>
        <p>마지막 변경: 2026.09.12</p>
      </div>
      <button class="btn sm" @click="emit('open', '비밀번호 변경')">비밀번호 변경</button>
    </div>
    <div class="settings-row">
      <div>
        <b>2단계 인증</b>
        <p>현재 설정되지 않음 · 보안 강화를 위해 권장합니다</p>
      </div>
      <button class="btn sm" @click="emit('open', '2단계 인증 설정')">설정하기</button>
    </div>
    <div class="settings-row">
      <div>
        <b>최근 로그인</b>
        <p>2026.11.17 09:12 · Windows / Chrome</p>
      </div>
      <button class="btn sm" @click="emit('open', '로그인 기기 및 세션')">로그인 기록</button>
    </div>
    <div class="settings-row">
      <div>
        <b>로그인 세션 및 기기</b>
        <p>현재 사용 중인 기기를 포함하여 2개 세션이 있습니다</p>
      </div>
      <button class="btn sm" @click="emit('open', '로그인 기기 및 세션')">기기 관리</button>
    </div>
    <div class="settings-row">
      <div>
        <b>다른 기기에서 로그아웃</b>
        <p>현재 기기를 제외한 모든 기기에서 로그아웃합니다.</p>
      </div>
      <button class="btn sm danger" @click="emit('open', '다른 기기에서 로그아웃')">
        로그아웃
      </button>
    </div>
  </template>
</template>
