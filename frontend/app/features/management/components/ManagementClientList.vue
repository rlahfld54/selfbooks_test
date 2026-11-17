<script setup lang="ts">
import ManagementBadge from '../ManagementBadge.vue'
import { formatAmount } from '~/utils/formatAmount'
import type { ManagementRows } from '../view-types'
import type { ManagementFilters } from '../view-types'
import type { Density } from '~/types/workspace'

import type { Client } from '../data'
import { clientTypes, clientStatuses, reviewStatuses } from '../options'
defineProps<{
  rows: Pick<ManagementRows, 'filteredClients' | 'clientStats'>
  filters: ManagementFilters
  density: Density
  staffNames: string[]
}>()
const emit = defineEmits<{
  filter: [key: keyof ManagementFilters, value: string]
  reset: []
  select: [client: Client]
}>()
function updateFilter(key: keyof ManagementFilters, event: Event) {
  if (event instanceof InputEvent && event.isComposing) return
  emit('filter', key, (event.target as HTMLInputElement | HTMLSelectElement).value)
}
</script>

<template>
  <div class="stats">
    <div class="panel stat">
      <div class="hint">전체 수임업체</div>
      <strong>{{ formatAmount(rows.clientStats.total) }}<span class="stat-note">개 업체</span></strong>
    </div>
    <div class="panel stat">
      <div class="hint">수임 중인 업체</div>
      <strong>{{ formatAmount(rows.clientStats.active) }}<span class="stat-note">개 업체</span></strong>
    </div>
    <div class="panel stat">
      <div class="hint">등록정보 검토 대기</div>
      <strong>{{ formatAmount(rows.clientStats.reviewPending) }}<span class="stat-note">개 업체</span></strong>
    </div>
    <div class="panel stat">
      <div class="hint">수임 종료 업체</div>
      <strong>{{ formatAmount(rows.clientStats.ended) }}<span class="stat-note">개 업체</span></strong>
    </div>
  </div>
  <section class="panel table-panel" aria-label="수임업체 목록">
    <div class="toolbar">
      <div class="search-box">
        <span aria-hidden="true">⌕</span>
        <input
          :value="filters.query" @input="updateFilter('query', $event)" @compositionend="updateFilter('query', $event)"
          class="control"
          aria-label="업체명 검색"
          placeholder="업체명 검색"
        />
      </div>
      <div class="search-box business-search">
        <span aria-hidden="true">⌕</span>
        <input
          :value="filters.biz" @input="updateFilter('biz', $event)" @compositionend="updateFilter('biz', $event)"
          class="control"
          aria-label="사업자번호 검색"
          placeholder="사업자번호 검색"
        />
      </div>
      <select
        :value="filters.kind"
        @change="updateFilter('kind', $event)"
        class="control"
        aria-label="개인/법인"
      >
        <option value="">개인/법인</option>
        <option v-for="value in clientTypes" :key="value">{{ value }}</option>
      </select>
      <select
        :value="filters.status"
        @change="updateFilter('status', $event)"
        class="control"
        aria-label="수임 상태"
      >
        <option value="">수임 상태</option>
        <option v-for="value in clientStatuses" :key="value">{{ value }}</option>
      </select>
      <select
        :value="filters.person"
        @change="updateFilter('person', $event)"
        class="control"
        aria-label="담당 직원"
      >
        <option value="">담당 직원</option>
        <option v-for="value in staffNames" :key="value">{{ value }}</option>
      </select>
      <select
        :value="filters.review"
        @change="updateFilter('review', $event)"
        class="control"
        aria-label="검토 상태"
      >
        <option value="">검토 상태</option>
        <option v-for="value in reviewStatuses" :key="value">{{ value }}</option>
      </select>
      <button class="btn sm" @click="emit('reset')">↻ 초기화</button>
    </div>
    <div class="toolbar result-toolbar">
      <span class="count-line"
        >전체 <strong>{{ formatAmount(rows.filteredClients.length) }}</strong
            >개 업체 표시</span
        >
      <span class="muted-note">업체 행을 클릭하면 우측 상세정보가 열립니다.</span>
    </div>
    <div class="table-scroll">
      <table class="management-table" :class="{ compact: density === 'compact' }">
        <caption class="sr-only">
          수임업체 목록
        </caption>
        <thead>
          <tr>
            <th scope="col">업체명</th>
            <th scope="col">사업자등록번호</th>
            <th scope="col">구분</th>
            <th scope="col">대표자명</th>
            <th scope="col">주담당자</th>
            <th scope="col">보조담당자</th>
            <th scope="col">수임 상태</th>
            <th scope="col">회사정보</th>
            <th scope="col">환경설정</th>
            <th scope="col">관리</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="client in rows.filteredClients" :key="client.id" @click="emit('select', client)">
            <td>
              <div class="table-name">{{ client.name }}</div>
              <div class="table-sub">{{ client.id }}</div>
            </td>
            <td>{{ client.biz }}</td>
            <td><ManagementBadge :value="client.type" /></td>
            <td>{{ client.ceo }}</td>
            <td>{{ client.primary }}</td>
            <td>{{ client.secondary.join(', ') || '—' }}</td>
            <td><ManagementBadge :value="client.status" /></td>
            <td><ManagementBadge :value="client.company" /></td>
            <td><ManagementBadge :value="client.environment" /></td>
            <td>
              <button
                class="small-link"
                :aria-label="client.name + ' 상세 보기'"
                @click.stop="emit('select', client)"
              >
                상세 보기 →
              </button>
            </td>
          </tr>
          <tr v-if="!rows.filteredClients.length">
            <td colspan="10" class="empty">
              검색 조건에 맞는 수임업체가 없습니다. 필터를 초기화해보세요.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <footer class="table-footer">
      <span>{{ formatAmount(rows.filteredClients.length) }}개 업체 · Mock Data</span>
      <NuxtLink class="small-link" to="/client-directory?source=live"
        >등록된 수임업체 조회</NuxtLink
        >
      <div class="pagination"><span class="page-num active" aria-current="page">1</span></div>
    </footer>
  </section>
</template>
