<script setup lang="ts">
import type { MockAccount } from '../types'
import { sideLabel } from '../types'
defineProps<{ rows: MockAccount[]; selectedId: number | null; checked: number[]; compact: boolean; sort: keyof MockAccount; descending: boolean }>()
const emit = defineEmits<{ select: [id: number]; check: [ids: number[]]; sort: [key: keyof MockAccount] }>()
const columns: { key: keyof MockAccount; label: string }[] = [
  { key: 'code', label: '계정코드' }, { key: 'name', label: '계정과목명' },
  { key: 'category', label: '대분류' }, { key: 'subcategory', label: '중분류' },
  { key: 'balanceSide', label: '성격' }, { key: 'isActive', label: '사용여부' },
]
</script>
<template>
  <div class="am-scroll">
    <table class="am-table" :class="{ compact }">
      <thead><tr>
        <th><input type="checkbox" aria-label="표시된 계정과목 전체 선택" :checked="rows.length > 0 && rows.every(a => checked.includes(a.id))" :indeterminate="rows.some(a => checked.includes(a.id)) && !rows.every(a => checked.includes(a.id))" @change="emit('check', ($event.target as HTMLInputElement).checked ? [...new Set([...checked, ...rows.map(a => a.id)])] : checked.filter(id => !rows.some(a => a.id === id)))"></th>
        <th v-for="column in columns" :key="column.key" :aria-sort="sort === column.key ? (descending ? 'descending' : 'ascending') : 'none'"><button @click="emit('sort', column.key)">{{ column.label }} <span>{{ sort === column.key ? (descending ? '↓' : '↑') : '↕' }}</span></button></th>
      </tr></thead>
      <tbody>
        <tr v-for="a in rows" :key="a.id" :class="{ selected: a.id === selectedId }" @click="emit('select', a.id)">
          <td @click.stop><input type="checkbox" :aria-label="a.name + ' 선택'" :checked="checked.includes(a.id)" @change="emit('check', ($event.target as HTMLInputElement).checked ? [...checked, a.id] : checked.filter(id => id !== a.id))"></td>
          <td class="am-code">{{ a.code }}</td><td><button class="am-row-link" @click.stop="emit('select', a.id)">{{ a.name }}</button></td>
          <td>{{ a.category }}</td><td>{{ a.subcategory || '—' }}</td><td>{{ sideLabel(a.balanceSide) }}</td>
          <td><span class="am-status" :class="{ inactive: !a.isActive }">{{ a.isActive ? '사용' : '미사용' }}</span></td>
        </tr>
        <tr v-if="!rows.length"><td colspan="7" class="am-empty">검색 결과가 없습니다. 검색어나 분류 조건을 변경하세요.</td></tr>
      </tbody>
    </table>
  </div>
</template>
