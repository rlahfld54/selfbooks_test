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
  reset: []
  select: [staff: Staff]
}>()
const columns = [
  { key: 'name', label: '이름' }, { key: 'login', label: '로그인 ID' },
  { key: 'email', label: '이메일' }, { key: 'team', label: '부서/팀' },
  { key: 'title', label: '직책' }, { key: 'role', label: '시스템 권한' },
  { key: 'status', label: '계정 상태' }, { key: 'joined', label: '가입일' },
  { key: 'actions', label: '관리', sortable: false },
]
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
      <button type="button" class="btn sm" @click="emit('reset')">↻ 초기화</button>
      <span class="count-line">{{ formatAmount(rows.filteredStaff.length) }}명 표시</span>
    </div>
    <DataTable appearance="management" :columns="columns" :rows="rows.filteredStaff" :density="density"
      :show-controls="false" :selection-column="false" configurable-columns caption="직원 목록"
      :empty-title="rows.staff.length ? '검색 조건에 해당하는 직원이 없습니다.' : '등록된 직원이 없습니다.'"
      :empty-description="rows.staff.length ? '필터를 초기화해보세요.' : ''" @select="emit('select', $event)">
      <template #cell-name="{ row }"><button class="small-link table-name" @click.stop="emit('select', row)">{{ row.name }}</button></template>
      <template #cell-role="{ row }"><ManagementBadge :value="row.role" /></template>
      <template #cell-status="{ row }"><ManagementBadge :value="row.status" /></template>
      <template #cell-actions="{ row }">
        <button class="small-link" :aria-label="row.name + ' 상세 보기'" @click.stop="emit('select', row)">상세 보기 →</button>
      </template>
    </DataTable>
  </div>
</template>
