<script setup lang="ts">
import { computed, ref } from 'vue'
import { accountCategories } from '../types'
import type { MockAccount } from '../types'
const props = defineProps<{ accounts: MockAccount[]; category: string; subcategory: string }>()
defineEmits<{ select: [category: string, subcategory: string] }>()
const categories = computed(() =>
  Object.fromEntries(
    Object.entries(accountCategories(props.accounts)).filter(([key]) => key !== '특수설정계정과목'),
  ),
)
const collapsed = ref<string[]>([])
function toggle(category: string) {
  collapsed.value = collapsed.value.includes(category)
    ? collapsed.value.filter((c) => c !== category)
    : [...collapsed.value, category]
}
const count = (category: string, subcategory = '') =>
  props.accounts.filter(
    (a) => a.category === category && (!subcategory || a.subcategory === subcategory),
  ).length
</script>
<template>
  <nav class="am-tree" aria-label="계정과목 분류">
    <h2>계정과목 분류</h2>
    <button :class="{ selected: !category }" @click="$emit('select', '', '')">
      전체
      <span>{{ accounts.length }}</span>
    </button>
    <button :class="{ selected: category === 'special' }" @click="$emit('select', 'special', '')">
      특수설정계정과목 (1000~1010)
    </button>
    <div v-for="(children, group) in categories" :key="group">
      <div class="am-tree-group">
        <button
          v-if="children.length"
          class="am-expand"
          :aria-expanded="!collapsed.includes(group)"
          :aria-label="group + ' 펼치기/접기'"
          @click="toggle(group)">
          {{ collapsed.includes(group) ? '›' : '⌄' }}
        </button>
        <button
          :class="{ selected: category === group && !subcategory }"
          @click="$emit('select', group, '')">
          {{ group }}
          <span>{{ count(group) }}</span>
        </button>
      </div>
      <div v-if="!collapsed.includes(group)" class="am-children">
        <button
          v-for="child in children"
          :key="child"
          :class="{ selected: category === group && subcategory === child }"
          @click="$emit('select', group, child)">
          {{ child }}
          <span>{{ count(group, child) }}</span>
        </button>
      </div>
    </div>
  </nav>
</template>
