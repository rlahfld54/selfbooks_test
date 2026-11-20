<script setup lang="ts">
import { useClientStore } from '~/stores/clientStore'
import ManagementBadge from '../ManagementBadge.vue'
import { formatAmount } from '~/utils/formatAmount'
import { formatBusinessNumber } from '~/utils/number-validation'
import type { ManagementRows } from '../view-types'
import type { ManagementFilters } from '../view-types'
import type { Density } from '~/types/workspace'

import type { Client } from '../data'
import { clientTypes, clientStatuses, reviewStatuses } from '../options'
import { assignmentRole } from '../assignments'
const clientStore = useClientStore()
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
  select: [client: Client]
  work: [client: Client]
}>()
const page = ref(1)
const pageSize = 5
const pageCount = computed(() =>
  Math.max(1, Math.ceil(props.rows.filteredClients.length / pageSize)),
)
watch(
  () => [props.mine, ...Object.values(props.filters)],
  () => {
    page.value = 1
  },
)
watch(pageCount, (count) => {
  page.value = Math.min(page.value, count)
})
function updateFilter(key: keyof ManagementFilters, event: Event) {
  if (event instanceof InputEvent && event.isComposing) return
  emit('filter', key, (event.target as HTMLInputElement | HTMLSelectElement).value)
}
</script>

<template>
  <div class="stats">
    <div class="panel stat">
      <div class="hint">{{ mine ? '내 담당 업체' : '전체 수임업체' }}</div>
      <strong>
        {{ loading || error ? '—' : formatAmount(mine ? summary.total : rows.clientStats.total) }}
        <span class="stat-note">개 업체</span>
      </strong>
    </div>
    <div class="panel stat">
      <div class="hint">{{ mine ? '주담당 업체' : '수임 중인 업체' }}</div>
      <strong>
        {{
          loading || error ? '—' : formatAmount(mine ? summary.primary : rows.clientStats.active)
        }}
        <span class="stat-note">개 업체</span>
      </strong>
    </div>
    <div class="panel stat">
      <div class="hint">{{ mine ? '보조담당 업체' : '등록정보 검토 대기' }}</div>
      <strong>
        {{
          loading || error || (!mine && !reviewKnown)
            ? '—'
            : formatAmount(mine ? summary.secondary : rows.clientStats.reviewPending)
        }}
        <span class="stat-note">개 업체</span>
      </strong>
    </div>
    <div class="panel stat">
      <div class="hint">{{ mine ? '확인 필요 업체' : '수임 종료 업체' }}</div>
      <strong>
        {{
          loading || error || (mine && !reviewKnown)
            ? '—'
            : formatAmount(mine ? summary.review : rows.clientStats.ended)
        }}
        <span class="stat-note">개 업체</span>
      </strong>
    </div>
  </div>
  <section class="panel table-panel" aria-label="수임업체 목록">
    <div class="toolbar">
      <div class="search-box">
        <span aria-hidden="true">⌕</span>
        <input
          :value="filters.query"
          @input="updateFilter('query', $event)"
          @compositionend="updateFilter('query', $event)"
          class="control"
          aria-label="업체명·사업자등록번호 검색"
          placeholder="업체명·사업자등록번호 검색" />
      </div>
      <div v-if="!mine" class="search-box business-search">
        <span aria-hidden="true">⌕</span>
        <input
          :value="filters.biz"
          @blur="emit('filter', 'biz', formatBusinessNumber(filters.biz))"
          @input="updateFilter('biz', $event)"
          @compositionend="updateFilter('biz', $event)"
          class="control"
          aria-label="사업자번호 검색"
          placeholder="사업자번호 검색" />
      </div>
      <select
        v-if="!mine"
        :value="filters.kind"
        @change="updateFilter('kind', $event)"
        class="control"
        aria-label="개인/법인">
        <option value="">개인/법인</option>
        <option v-for="value in clientTypes" :key="value">{{ value }}</option>
      </select>
      <select
        :value="filters.status"
        @change="updateFilter('status', $event)"
        class="control"
        aria-label="수임 상태">
        <option value="">수임 상태</option>
        <option v-for="value in clientStatuses" :key="value">{{ value }}</option>
      </select>
      <select
        v-if="!mine"
        :value="filters.person"
        @change="updateFilter('person', $event)"
        class="control"
        aria-label="담당 직원">
        <option value="">담당 직원</option>
        <option v-for="person in staffOptions" :key="person.id" :value="person.id">
          {{ person.name }}
        </option>
      </select>
      <select
        :value="filters.review"
        @change="updateFilter('review', $event)"
        class="control"
        aria-label="검토 상태">
        <option value="">검토 상태</option>
        <option v-for="value in reviewStatuses" :key="value">{{ value }}</option>
      </select>
      <select
        v-if="mine"
        class="control"
        aria-label="담당 구분"
        :value="filters.role"
        @change="updateFilter('role', $event)">
        <option value="">담당 구분 전체</option>
        <option>주담당</option>
        <option>보조담당</option>
      </select>
      <button class="btn sm" @click="emit('reset')">↻ 초기화</button>
    </div>
    <div class="toolbar result-toolbar">
      <span class="count-line">
        전체
        <strong>{{ formatAmount(rows.filteredClients.length) }}</strong>
        개 업체 표시
      </span>
      <span class="muted-note">업체 행을 클릭하면 우측 상세정보가 열립니다.</span>
    </div>
    <div class="table-scroll">
      <table class="management-table" :class="{ compact: density === 'compact' }">
        <caption class="sr-only">수임업체 목록</caption>
        <thead>
          <tr>
            <th scope="col">업체명</th>
            <th scope="col">사업자등록번호</th>
            <th scope="col">구분</th>
            <th scope="col">{{ mine ? '내 담당 역할' : '대표자명' }}</th>
            <th scope="col">주담당자</th>
            <th v-if="!mine" scope="col">보조담당자</th>
            <th scope="col">수임 상태</th>
            <th scope="col">{{ mine ? '검토 상태' : '회사정보' }}</th>
            <th v-if="!mine" scope="col">환경설정</th>
            <th scope="col">업무 바로가기</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="client in loading || error
              ? []
              : clientStore.clients
                  .filter((row) => rows.filteredClients.includes(row))
                  .slice((page - 1) * pageSize, page * pageSize)"
            :key="client.id"
            :class="{ selected: selectedId === client.id }"
            @click="emit('select', client)">
            <td>
              <button class="small-link table-name" @click.stop="emit('select', client)">
                {{ client.name }}
              </button>
              <div class="table-sub">{{ client.id }}</div>
            </td>
            <td>{{ formatBusinessNumber(client.biz) || '정보 없음' }}</td>
            <td><ManagementBadge :value="client.type" /></td>
            <td>{{ mine ? assignmentRole(client, userId) : client.ceo || '정보 없음' }}</td>
            <td>{{ client.primary || '미배정' }}</td>
            <td v-if="!mine">{{ client.secondary.join(', ') || '—' }}</td>
            <td><ManagementBadge :value="client.status" /></td>
            <td>
              <span v-if="mine">등록</span>
              <ManagementBadge :value="client.company || '정보 없음'" />
              <div v-if="mine" class="review-line">
                환경
                <ManagementBadge :value="client.environment || '정보 없음'" />
              </div>
            </td>
            <td v-if="!mine"><ManagementBadge :value="client.environment" /></td>
            <td>
              <button
                class="small-link"
                :aria-label="client.name + ' 업무 열기'"
                @click.stop="emit('work', client)">
                업무 열기 →
              </button>
            </td>
          </tr>
          <tr v-if="loading">
            <td :colspan="mine ? 8 : 10" role="status" class="empty">
              수임업체를 불러오는 중입니다.
            </td>
          </tr>
          <tr v-else-if="error">
            <td :colspan="mine ? 8 : 10" class="empty" role="alert">
              {{ error }} 상단 새로고침 버튼으로 다시 조회해 주세요.
            </td>
          </tr>
          <tr v-else-if="!rows.filteredClients.length">
            <td :colspan="mine ? 8 : 10" class="empty">
              {{
                total
                  ? '검색 조건에 맞는 수임업체가 없습니다. 필터를 초기화해보세요.'
                  : mine
                    ? '배정된 담당 업체가 없습니다.'
                    : '등록된 수임업체가 없습니다.'
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <footer class="table-footer">
      <span>{{ formatAmount(rows.filteredClients.length) }}개 업체 · 실제 조회</span>
      <span class="muted-note">담당자 배정은 임시 적용</span>
      <nav class="pagination" aria-label="업체 목록 페이지">
        <button class="btn sm" :disabled="page <= 1" @click="page--">이전</button>
        <span aria-live="polite">{{ page }} / {{ pageCount }}</span>
        <button class="btn sm" :disabled="page >= pageCount" @click="page++">다음</button>
      </nav>
    </footer>
  </section>
</template>

<style scoped>
.stats {
  margin-top: 20px;
}
.review-line {
  margin-top: 6px;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.toolbar .search-box {
  flex: 1 1 220px;
  min-width: 0;
}
.toolbar .control {
  max-width: 100%;
}
.toolbar .search-box input {
  width: 100%;
  padding-left: 32px;
}
.toolbar > select {
  flex: 0 1 145px;
  min-width: 120px;
}
.table-scroll {
  overflow-x: auto;
}
.management-table {
  min-width: 1000px;
}
.management-table tr.selected {
  background: #eaf1ff;
}
.pagination {
  display: flex;
  align-items: center;
  gap: 12px;
}
.table-footer {
  flex-wrap: wrap;
  gap: 12px;
}
</style>
