<script setup lang="ts">
import ManagementBadge from '../ManagementBadge.vue'
import { formatAmount } from '~/utils/formatAmount'
import type { ManagementRows } from '../view-types'
import type { ManagementFilters } from '../view-types'
import type { Density } from '~/types/workspace'

import type { Staff } from '../data'
import { usePermissionStore } from '~/stores/permissionStore'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { teams, staffStatuses } from '../options'
const { state: workspace } = useWorkspaceContext()
const roles = usePermissionStore().forScope(workspace).roles
defineProps<{
  rows: Pick<ManagementRows, 'staff' | 'filteredStaff'>
  filters: ManagementFilters
  density: Density
}>()
const emit = defineEmits<{
  filter: [key: keyof ManagementFilters, value: string]
  invite: []
  select: [staff: Staff]
}>()
function updateFilter(key: keyof ManagementFilters, event: Event) {
  if (event instanceof InputEvent && event.isComposing) return
  emit('filter', key, (event.target as HTMLInputElement | HTMLSelectElement).value)
}
</script>

<template>
  <div class="section-heading">
    <div>
      <h3>직원 관리</h3>
      <p>총 {{ formatAmount(rows.staff.length) }}명의 소속 직원 및 계정 상태를 관리합니다.</p>
    </div>
    <button class="btn primary" @click="emit('invite')">+ 직원 초대</button>
  </div>
  <div class="panel table-panel">
    <div class="toolbar">
      <div class="search-box">
        <span aria-hidden="true">⌕</span
            ><input
          :value="filters.query" @input="updateFilter('query', $event)" @compositionend="updateFilter('query', $event)"
          class="control"
          aria-label="이름, ID, 이메일 검색"
          placeholder="이름, ID, 이메일 검색"
        />
      </div>
      <select
        :value="filters.team"
        @change="updateFilter('team', $event)"
        class="control"
        aria-label="전체 부서"
      >
        <option value="">전체 부서</option>
        <option v-for="value in teams" :key="value">{{ value }}</option>
      </select>
      <select
        :value="filters.role"
        @change="updateFilter('role', $event)"
        class="control"
        aria-label="전체 권한"
      >
        <option value="">전체 권한</option>
        <option v-for="value in roles" :key="value">{{ value }}</option>
      </select>
      <select
        :value="filters.status"
        @change="updateFilter('status', $event)"
        class="control"
        aria-label="전체 상태"
      >
        <option value="">전체 상태</option>
        <option v-for="value in staffStatuses" :key="value">{{ value }}</option>
      </select>
      <span class="count-line">{{ formatAmount(rows.filteredStaff.length) }}명 표시</span>
    </div>
    <div class="table-scroll">
      <table class="management-table" :class="{ compact: density === 'compact' }">
        <caption class="sr-only">
          직원 목록
        </caption>
        <thead>
          <tr>
            <th scope="col">이름</th>
            <th scope="col">로그인 ID</th>
            <th scope="col">이메일</th>
            <th scope="col">부서/팀</th>
            <th scope="col">직책</th>
            <th scope="col">시스템 권한</th>
            <th scope="col">계정 상태</th>
            <th scope="col">가입일</th>
            <th scope="col">관리</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="employee in rows.filteredStaff"
            :key="employee.id"
            @click="emit('select', employee)"
          >
            <td class="table-name">{{ employee.name }}</td>
            <td>{{ employee.login }}</td>
            <td>{{ employee.email }}</td>
            <td>{{ employee.team }}</td>
            <td>{{ employee.title }}</td>
            <td><ManagementBadge :value="employee.role" /></td>
            <td><ManagementBadge :value="employee.status" /></td>
            <td>{{ employee.joined }}</td>
            <td>
              <button
                class="small-link"
                :aria-label="employee.name + ' 상세 보기'"
                @click.stop="emit('select', employee)"
              >
                상세 보기 →
              </button>
            </td>
          </tr>
          <tr v-if="!rows.filteredStaff.length">
            <td colspan="9" class="empty">검색 조건에 해당하는 직원이 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
