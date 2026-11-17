<script setup lang="ts">
import ManagementBadge from '../ManagementBadge.vue'
import ManagementDialog from '../ManagementDialog.vue'
import { formatAmount } from '~/utils/formatAmount'

import type { Client, Staff } from '../data'
defineProps<{ staff: Staff; organizationName: string; assignedClients: Client[] }>()
const emit = defineEmits<{ close: []; role: []; deactivate: [] }>()
</script>

<template>
  <ManagementDialog
    :label="staff.name"
    drawer
    @close="emit('close')"
  >
    <template #heading>
      <div>
        <div class="eyebrow">EMPLOYEE DETAILS</div>
        <h2>{{ staff.name }} <ManagementBadge :value="staff.status" /></h2>
        <p class="sub">{{ staff.email }}</p>
      </div>
    </template>
    <section class="drawer-section">
      <h3>직원 기본정보</h3>
      <div class="info-row">
        <span class="label">로그인 ID</span>
        <span class="value">{{ staff.login }}</span>
      </div>
      <div class="info-row">
        <span class="label">부서/팀</span>
        <span class="value">{{ staff.team }}</span>
      </div>
      <div class="info-row">
        <span class="label">직책</span>
        <span class="value">{{ staff.title }}</span>
      </div>
      <div class="info-row">
        <span class="label">조직명</span>
        <span class="value">{{ organizationName }}</span>
      </div>
      <div class="info-row">
        <span class="label">시스템 역할</span>
        <span class="value"><ManagementBadge :value="staff.role || ''" /></span>
      </div>
      <div class="info-row">
        <span class="label">가입일</span>
        <span class="value">{{ staff.joined }}</span>
      </div>
    </section>
    <section class="drawer-section">
      <h3>담당 수임업체 · {{ formatAmount(assignedClients.length) }}개</h3>
      <NuxtLink
        v-for="client in assignedClients"
        :key="client.id"
        class="link-line"
        :to="{ path: '/client-directory', query: { client: client.id } }"
        >{{ client.name }} <span>상세 →</span></NuxtLink
        >
      <p v-if="!assignedClients.length" class="sub">지정된 업체가 없습니다.</p>
    </section>
    <template #footer>
      <button class="btn" @click="emit('role')">권한 변경</button>
      <button class="btn danger" @click="emit('deactivate')">계정 비활성화</button>
    </template>
  </ManagementDialog>
</template>
