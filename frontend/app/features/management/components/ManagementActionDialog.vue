<script setup lang="ts">
import ManagementBadge from '../ManagementBadge.vue'
import ManagementDialog from '../ManagementDialog.vue'

import type { Staff } from '../data'
import { roles } from '../data'
import { teams, clientTypes } from '../options'
const props = defineProps<{
  modal: string
  title: string
  form: Record<string, string>
  secondary: string[]
  staffQuery: string
  activeStaff: Staff[]
  filteredActiveStaff: Staff[]
  selectedStaff?: Staff
  message: string
}>()
const emit = defineEmits<{
  close: []
  save: []
  field: [key: string, value: string]
  'update:secondary': [names: string[]]
  'update:staffQuery': [query: string]
  message: [message: string]
}>()
function updateField(key: string, event: Event) {
  if (event instanceof InputEvent && event.isComposing) return
  emit('field', key, (event.target as HTMLInputElement | HTMLSelectElement).value)
}
function searchStaff(event: Event) {
  if (event instanceof InputEvent && event.isComposing) return
  emit('update:staffQuery', (event.target as HTMLInputElement).value)
}
function toggleSecondary(name: string, event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  emit('update:secondary', checked
    ? [...new Set([...props.secondary, name])]
    : props.secondary.filter((value) => value !== name))
}
</script>

<template>
  <ManagementDialog :label="title" @close="emit('close')">
    <form id="management-form" @submit.prevent="emit('save')">
      <template v-if="modal === '수임업체 등록'">
        <div class="alert management-notice">
          기본정보를 먼저 등록한 뒤 기존 회사등록·환경등록 화면에서 검토하는 흐름입니다.
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="client-name">업체명 *</label
                ><input
              id="client-name"
              :value="form['name']"
              @input="updateField('name', $event)"
              @compositionend="updateField('name', $event)"
              placeholder="예: 주식회사 새봄"
            />
          </div>
          <div class="field">
            <label for="client-business">사업자등록번호 *</label
                ><input
              id="client-business"
              :value="form['biz']"
              @input="updateField('biz', $event)"
              @compositionend="updateField('biz', $event)"
              placeholder="000-00-00000"
            />
          </div>
          <div class="field">
            <label for="client-type">개인/법인 구분</label
                ><select id="client-type" :value="form['type']" @change="updateField('type', $event)">
              <option v-for="value in clientTypes" :key="value">{{ value }}</option>
            </select>
          </div>
          <div class="field">
            <label for="client-ceo">대표자명 *</label
                ><input
              id="client-ceo"
              :value="form['ceo']"
              @input="updateField('ceo', $event)"
              @compositionend="updateField('ceo', $event)"
              placeholder="대표자명"
            />
          </div>
          <div class="field">
            <label for="client-primary">주담당자</label
                ><select id="client-primary" :value="form['primary']" @change="updateField('primary', $event)">
              <option v-for="employee in activeStaff" :key="employee.id" :value="employee.id">
                {{ employee.name }}
              </option>
            </select>
          </div>
          <div class="field">
            <label for="client-start">수임 시작일</label
                ><input
              id="client-start"
              :value="form['start']"
              @input="updateField('start', $event)"
              @compositionend="updateField('start', $event)"
              type="date"
            />
          </div>
        </div>
      </template>
      <template v-if="modal === '담당자 지정'">
        <div class="alert management-notice">
          주담당자는 1명, 보조담당자는 여러 명 지정할 수 있습니다. 활성 직원만 표시합니다.
        </div>
        <div class="field">
          <label for="assign-primary">주담당자</label
              ><select id="assign-primary" :value="form['primary']" @change="updateField('primary', $event)">
            <option v-for="employee in activeStaff" :key="employee.id" :value="employee.id">
              {{ employee.name }}
            </option>
          </select>
        </div>
      </template>
      <fieldset v-if="modal === '수임업체 등록' || modal === '담당자 지정'" class="staff-picker">
        <legend class="field-label">
          {{ modal === '수임업체 등록' ? '보조담당자 (복수 선택)' : '보조담당자' }}
        </legend>
        <input
          v-if="modal === '담당자 지정'"
          :value="staffQuery" @input="searchStaff($event)" @compositionend="searchStaff($event)"
          class="control"
          aria-label="직원 검색"
          placeholder="직원 검색"
        />
        <div class="checkbox-list">
          <label v-for="employee in filteredActiveStaff" :key="employee.id">
            <input
              :checked="secondary.includes(employee.id)" @change="toggleSecondary(employee.id, $event)"
              type="checkbox"
              :value="employee.id"
              :disabled="employee.id === form.primary"
            />
            {{ employee.name }} · {{ employee.team }}
          </label>
        </div>
      </fieldset>
      <template v-if="modal === '지점 추가' || modal === '사무소 수정'">
        <div class="field">
          <label for="management-name">지점명</label>
          <input
            id="management-name"
            :value="form['name']"
            @input="updateField('name', $event)"
            @compositionend="updateField('name', $event)"
            placeholder="지점명을 입력하세요"
            type="text"
          />
        </div>
        <div class="field">
          <label for="management-address">사업장 주소</label>
          <input
            id="management-address"
            :value="form['address']"
            @input="updateField('address', $event)"
            @compositionend="updateField('address', $event)"
            placeholder="사업장 주소"
            type="text"
          />
        </div>
        <div class="field">
          <label for="management-phone">대표 연락처</label>
          <input
            id="management-phone"
            :value="form['phone']"
            @input="updateField('phone', $event)"
            @compositionend="updateField('phone', $event)"
            placeholder="02-0000-0000"
            type="text"
          />
        </div>
      </template>
      <template v-if="modal === '비밀번호 변경'">
        <div class="field">
          <label for="management-old">현재 비밀번호</label>
          <input
            id="management-old"
            :value="form['old']"
            @input="updateField('old', $event)"
            @compositionend="updateField('old', $event)"
            placeholder="현재 비밀번호"
            type="password"
          />
        </div>
        <div class="field">
          <label for="management-new">새 비밀번호</label>
          <input
            id="management-new"
            :value="form['new']"
            @input="updateField('new', $event)"
            @compositionend="updateField('new', $event)"
            placeholder="새 비밀번호"
            type="password"
          />
        </div>
        <div class="field">
          <label for="management-confirm">비밀번호 확인</label>
          <input
            id="management-confirm"
            :value="form['confirm']"
            @input="updateField('confirm', $event)"
            @compositionend="updateField('confirm', $event)"
            placeholder="다시 입력"
            type="password"
          />
        </div>
      </template>
      <template v-if="modal === '직원 초대'">
        <div class="alert management-notice">
          실제 이메일은 발송되지 않습니다. 초대 대기 상태의 Mock Data만 추가됩니다.
        </div>
        <div class="field">
          <label for="invite-email">초대 이메일 *</label
              ><input
            id="invite-email"
            :value="form['email']" @input="updateField('email', $event)" @compositionend="updateField('email', $event)"
            type="email"
            placeholder="name@company.com"
          />
        </div>
        <div class="field">
          <label for="invite-team">부서/팀</label
              ><select id="invite-team" :value="form['team']" @change="updateField('team', $event)">
            <option v-for="value in teams" :key="value">{{ value }}</option>
          </select>
        </div>
        <div class="field">
          <label for="invite-title">직책</label
              ><input
            id="invite-title"
            :value="form['title']"
            @input="updateField('title', $event)"
            @compositionend="updateField('title', $event)"
            placeholder="세무대리"
          />
        </div>
      </template>
      <p v-if="modal === '직원 권한 변경'">{{ selectedStaff?.name }} 님의 역할을 변경합니다.</p>
      <div v-if="modal === '직원 초대' || modal === '직원 권한 변경'" class="field">
        <label for="staff-role">시스템 역할</label
            ><select id="staff-role" :value="form['role']" @change="updateField('role', $event)">
          <option v-for="value in roles" :key="value">{{ value }}</option>
        </select>
      </div>
      <div v-if="modal === '지점 추가' || modal === '사무소 수정'" class="field">
        <label for="branch-status">운영 상태</label
            ><select id="branch-status" :value="form['status']" @change="updateField('status', $event)">
          <option>활성</option>
          <option>비활성</option>
        </select>
      </div>
      <p v-if="modal === '비밀번호 변경'" class="muted-note">
        실제 비밀번호는 변경되지 않습니다.
      </p>
      <template v-if="modal === '2단계 인증 설정'">
        <p>실제 인증 연동 전 화면 예시입니다.</p>
        <div class="settings-row">
          <b>인증 앱으로 로그인 보호</b><span class="switch" aria-label="설정되지 않음"></span>
        </div>
      </template>
      <template v-if="modal === '로그인 기기 및 세션'">
        <div class="settings-row">
          <div>
            <b>Windows · Chrome</b>
            <p>2026.11.17 09:12 · 현재 기기</p>
          </div>
          <ManagementBadge value="활성" />
        </div>
        <div class="settings-row">
          <div>
            <b>iPhone · Safari</b>
            <p>2026.11.15 18:30 · 다른 기기</p>
          </div>
          <button
            type="button"
            class="btn sm"
            @click="emit('message', '세션 종료 UI만 시뮬레이션합니다.')"
          >
            로그아웃
          </button>
        </div>
      </template>
      <template v-if="modal === '다른 기기에서 로그아웃'">
        <p>현재 기기를 제외한 모든 기기의 세션을 종료하시겠습니까?</p>
        <div class="alert">실제 세션 삭제는 수행되지 않습니다.</div>
      </template>
      <template v-if="modal === '직원 계정 비활성화'">
        <p>
          <strong>{{ selectedStaff?.name }}</strong
              >님의 계정을 비활성화하시겠습니까?
        </p>
        <div class="alert">실제 로그인 차단은 수행되지 않습니다.</div>
      </template>
      <div v-if="modal === '직원 권한 변경'" class="alert">
        권한 변경은 데모 상태에만 반영됩니다.
      </div>
      <p
        v-if="message"
        :role="modal === '로그인 기기 및 세션' ? 'status' : 'alert'"
        class="alert management-feedback"
      >
        {{ message }}
      </p>
    </form>
    <template #footer>
      <button class="btn" @click="emit('close')">취소</button>
      <button class="btn primary" form="management-form">확인</button>
    </template>
  </ManagementDialog>
</template>
