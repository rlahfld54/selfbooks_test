<script setup lang="ts">
import ManagementBadge from '../ManagementBadge.vue'
import { formatAmount } from '~/utils/formatAmount'
import { formatBusinessNumber } from '~/utils/number-validation'
import type { ManagementRows } from '../view-types'
import type { ManagementFilters } from '../view-types'
import type { Density } from '~/types/workspace'

import type { Client } from '../data'
import { clientTypes, clientStatuses, reviewStatuses } from '../options'
import { assignmentRole } from '../assignments'

const props = defineProps<{
  rows: Pick<ManagementRows, 'filteredClients' | 'clientStats'>
  filters: ManagementFilters
  density: Density
  staffOptions: { id: string; name: string }[]
  loading: boolean
  error: string
  reviewKnown: boolean
  mine: boolean
  userId: string
  admin: boolean
  selectedId?: string
  total: number
  summary: { total: number; primary: number; secondary: number; review: number }
}>()
const emit = defineEmits<{
  filter: [key: keyof ManagementFilters, value: string]
  reset: []
  retry: []
  select: [client: Client]
  work: [client: Client]
}>()
const columns = computed(() => [
  { key: 'name', label: '업체명' }, { key: 'biz', label: '사업자등록번호' },
  { key: 'type', label: '구분' }, { key: 'ceo', label: props.mine ? '내 담당 역할' : '대표자명', sortable: !props.mine },
  { key: 'primary', label: '주담당자' },
  ...(!props.mine ? [{ key: 'secondary', label: '보조담당자' }] : []),
  { key: 'status', label: '수임 상태' }, { key: 'company', label: props.mine ? '검토 상태' : '회사정보' },
  ...(!props.mine ? [{ key: 'environment', label: '환경설정' }] : []),
  { key: 'work', label: '업무 바로가기', sortable: false },
])
function updateFilter(key: keyof ManagementFilters, event: Event) {
  if (event instanceof InputEvent && event.isComposing) return
  emit('filter', key, (event.target as HTMLInputElement | HTMLSelectElement).value)
}
</script>

<template>
  <div data-ui-management-client-list class="stats">
    <div data-ui-management-client-list class="panel stat">
      <div data-ui-management-client-list class="hint">{{ mine ? '내 담당 업체' : '전체 수임업체' }}</div>
      <strong data-ui-management-client-list>
        {{ loading || error ? '—' : formatAmount(mine ? summary.total : rows.clientStats.total) }}
        <span data-ui-management-client-list class="stat-note">개 업체</span>
      </strong>
    </div>
    <div data-ui-management-client-list class="panel stat">
      <div data-ui-management-client-list class="hint">{{ mine ? '주담당 업체' : '수임 중인 업체' }}</div>
      <strong data-ui-management-client-list>
        {{
          loading || error ? '—' : formatAmount(mine ? summary.primary : rows.clientStats.active)
        }}
        <span data-ui-management-client-list class="stat-note">개 업체</span>
      </strong>
    </div>
    <div data-ui-management-client-list class="panel stat">
      <div data-ui-management-client-list class="hint">{{ mine ? '보조담당 업체' : '등록정보 검토 대기' }}</div>
      <strong data-ui-management-client-list>
        {{
          loading || error || (!mine && !reviewKnown)
            ? '—'
            : formatAmount(mine ? summary.secondary : rows.clientStats.reviewPending)
        }}
        <span data-ui-management-client-list class="stat-note">개 업체</span>
      </strong>
    </div>
    <div data-ui-management-client-list class="panel stat">
      <div data-ui-management-client-list class="hint">{{ mine ? '확인 필요 업체' : '수임 종료 업체' }}</div>
      <strong data-ui-management-client-list>
        {{
          loading || error || (mine && !reviewKnown)
            ? '—'
            : formatAmount(mine ? summary.review : rows.clientStats.ended)
        }}
        <span data-ui-management-client-list class="stat-note">개 업체</span>
      </strong>
    </div>
  </div>
  <section data-ui-management-client-list class="panel table-panel" aria-label="수임업체 목록">
    <div data-ui-management-client-list class="toolbar">
      <div data-ui-management-client-list class="search-box">
        <span data-ui-management-client-list aria-hidden="true">⌕</span>
        <input data-ui-management-client-list
          :value="filters.query"
          @input="updateFilter('query', $event)"
          @compositionend="updateFilter('query', $event)"
          class="control"
          aria-label="업체명·사업자등록번호 검색"
          placeholder="업체명·사업자등록번호 검색" />
      </div>
      <div data-ui-management-client-list v-if="!mine" class="search-box business-search">
        <span data-ui-management-client-list aria-hidden="true">⌕</span>
        <input data-ui-management-client-list
          :value="filters.biz"
          @blur="emit('filter', 'biz', formatBusinessNumber(filters.biz))"
          @input="updateFilter('biz', $event)"
          @compositionend="updateFilter('biz', $event)"
          class="control"
          aria-label="사업자번호 검색"
          placeholder="사업자번호 검색" />
      </div>
      <select data-ui-management-client-list
        v-if="!mine"
        :value="filters.kind"
        @change="updateFilter('kind', $event)"
        class="control"
        aria-label="개인/법인">
        <option data-ui-management-client-list value="">개인/법인</option>
        <option data-ui-management-client-list v-for="value in clientTypes" :key="value">{{ value }}</option>
      </select>
      <select data-ui-management-client-list
        :value="filters.status"
        @change="updateFilter('status', $event)"
        class="control"
        aria-label="수임 상태">
        <option data-ui-management-client-list value="">수임 상태</option>
        <option data-ui-management-client-list v-for="value in clientStatuses" :key="value">{{ value }}</option>
      </select>
      <select data-ui-management-client-list
        v-if="!mine"
        :value="filters.person"
        @change="updateFilter('person', $event)"
        class="control"
        aria-label="담당 직원">
        <option data-ui-management-client-list value="">담당 직원</option>
        <option data-ui-management-client-list v-for="person in staffOptions" :key="person.id" :value="person.id">
          {{ person.name }}
        </option>
      </select>
      <select data-ui-management-client-list
        :value="filters.review"
        @change="updateFilter('review', $event)"
        class="control"
        aria-label="검토 상태">
        <option data-ui-management-client-list value="">검토 상태</option>
        <option data-ui-management-client-list v-for="value in reviewStatuses" :key="value">{{ value }}</option>
      </select>
      <select data-ui-management-client-list
        v-if="mine"
        class="control"
        aria-label="담당 구분"
        :value="filters.role"
        @change="updateFilter('role', $event)">
        <option data-ui-management-client-list value="">담당 구분 전체</option>
        <option data-ui-management-client-list>주담당</option>
        <option data-ui-management-client-list>보조담당</option>
      </select>
      <button data-ui-management-client-list class="btn sm" @click="emit('reset')">↻ 초기화</button>
    </div>
    <div data-ui-management-client-list class="toolbar result-toolbar">
      <span data-ui-management-client-list class="count-line">
        전체
        <strong data-ui-management-client-list>{{ formatAmount(rows.filteredClients.length) }}</strong>
        개 업체 표시
      </span>
      <span data-ui-management-client-list class="muted-note">업체 행을 클릭하면 우측 상세정보가 열립니다.</span>
    </div>
    <DataTable
      appearance="management" :columns="columns" :rows="rows.filteredClients"
      :density="density" :selected="selectedId" :loading="loading" :error="error"
      :show-controls="false" :selection-column="false" :sample="false" configurable-columns
      caption="수임업체 목록" :page-size="5"
      :empty-title="total ? '검색 조건에 맞는 수임업체가 없습니다.' : mine ? '배정된 담당 업체가 없습니다.' : '등록된 수임업체가 없습니다.'"
      :empty-description="total ? '필터를 초기화해보세요.' : ''"
      @select="emit('select', $event)" @retry="emit('retry')">
      <template #cell-name="{ row }">
        <button class="small-link table-name" @click.stop="emit('select', row)">{{ row.name }}</button>
        <div class="table-sub">{{ row.id }}</div>
      </template>
      <template #cell-biz="{ row }">{{ formatBusinessNumber(row.biz) || '정보 없음' }}</template>
      <template #cell-type="{ row }"><ManagementBadge :value="row.type" /></template>
      <template #cell-ceo="{ row }">{{ mine ? assignmentRole(row, userId) : row.ceo || '정보 없음' }}</template>
      <template #cell-primary="{ row }">{{ row.primary || '미배정' }}</template>
      <template #cell-secondary="{ row }">{{ row.secondary.join(', ') || '—' }}</template>
      <template #cell-status="{ row }"><ManagementBadge :value="row.status" /></template>
      <template #cell-company="{ row }">
        <span v-if="mine">등록</span><ManagementBadge :value="row.company || '정보 없음'" />
        <div v-if="mine" data-ui-management-client-list class="review-line">환경 <ManagementBadge :value="row.environment || '정보 없음'" /></div>
      </template>
      <template #cell-environment="{ row }"><ManagementBadge :value="row.environment || '정보 없음'" /></template>
      <template #cell-work="{ row }">
        <button class="small-link" :aria-label="row.name + ' 업무 열기'" @click.stop="emit('work', row)">업무 열기 →</button>
      </template>
      <template #footer="{ page, pageCount, previous, next }">
        <footer data-ui-management-client-list class="table-footer">
          <span>{{ formatAmount(rows.filteredClients.length) }}개 업체 · 실제 조회</span>
          <span class="muted-note">담당자 배정은 임시 적용</span>
          <nav data-ui-management-client-list class="pagination" aria-label="업체 목록 페이지">
            <button class="btn sm" :disabled="page <= 1 || loading" @click="previous">이전</button>
            <span aria-live="polite">{{ page }} / {{ pageCount }}</span>
            <button class="btn sm" :disabled="page >= pageCount || loading" @click="next">다음</button>
          </nav>
        </footer>
      </template>
    </DataTable>
  </section>
</template>
