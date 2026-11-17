<script setup lang="ts">
import ManagementBadge from '../ManagementBadge.vue'
import { formatAmount } from '~/utils/formatAmount'
import type { ManagementRows } from '../view-types'

defineProps<{ rows: Pick<ManagementRows, 'branches'> }>()
const emit = defineEmits<{ add: []; edit: [id: string] }>()
</script>

<template>
  <div class="section-heading">
    <div>
      <h3>본사 및 지점</h3>
      <p>회계법인 산하의 사무소별 주소와 직원을 관리합니다.</p>
    </div>
    <button class="btn primary" @click="emit('add')">+ 지점 추가</button>
  </div>
  <div class="location-cards">
    <section
      v-for="branch in rows.branches"
      :key="branch.id"
      class="panel location-card"
    >
      <div class="location-heading">
        <h3>{{ branch.name }}</h3>
        <ManagementBadge :value="branch.kind" />
      </div>
      <p>
        {{ branch.address }}<br />{{ branch.phone }}<br /><ManagementBadge
          :value="branch.status"
        />
      </p>
      <div class="loc-count">
        <b>{{ formatAmount(branch.count) }}명</b>소속 직원
        <button class="small-link" @click="emit('edit', branch.id)">정보 수정 →</button>
      </div>
    </section>
  </div>
</template>
