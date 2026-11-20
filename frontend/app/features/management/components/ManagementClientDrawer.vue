<script setup lang="ts">
import { clientWorkLinks } from '../client-work'
import { formatBusinessNumber } from '~/utils/number-validation'
import ManagementBadge from '../ManagementBadge.vue'
import ManagementDialog from '../ManagementDialog.vue'

import type { Client } from '../data'
import type { ManagementDestination } from '../view-types'
defineProps<{ client: Client; admin?: boolean }>()
const emit = defineEmits<{
  close: []
  assign: []
  navigate: [destination: ManagementDestination]
}>()
</script>

<template>
  <ManagementDialog
    :label="client.name"
    drawer
    @close="emit('close')"
  >
    <template #heading>
      <div>
        <span class="eyebrow">CLIENT DETAILS · {{ client.id }}</span>
        <h2>{{ client.name }}</h2>
        <div class="drawer-badges">
          <ManagementBadge :value="client.type" /><ManagementBadge
            :value="client.status"
          />
        </div>
      </div>
    </template>
    <section class="drawer-section">
      <h3>업체 기본정보</h3>
      <div class="info-row">
        <span class="label">사업자등록번호</span>
        <span class="value">{{ formatBusinessNumber(client.biz) || '정보 없음' }}</span>
      </div>
      <div class="info-row">
        <span class="label">대표자명</span>
        <span class="value">{{ client.ceo || '정보 없음' }}</span>
      </div>
      <div class="info-row">
        <span class="label">사업장 주소</span>
        <span class="value">{{ client.address || '정보 없음' }}</span>
      </div>
    </section>
    <section class="drawer-section">
      <div class="section-heading drawer-section-heading">
        <h3>수임 정보</h3>
        <button v-if="admin" class="small-link" @click="emit('assign')">담당자 변경 →</button>
      </div>
      <div class="info-row">
        <span class="label">수임 상태</span><ManagementBadge :value="client.status" />
      </div>
      <div class="info-row">
        <span class="label">수임 시작일</span>
        <span class="value">{{ client.start || '—' }}</span>
      </div>
      <div class="info-row">
        <span class="label">수임 종료일</span>
        <span class="value">{{ client.end || '—' }}</span>
      </div>
      <div class="info-row">
        <span class="label">주담당자</span>
        <span class="value">{{ client.primary || '—' }}</span>
      </div>
      <div class="info-row">
        <span class="label">보조담당자</span>
        <span class="value">{{ client.secondary.join(', ') || '—' }}</span>
      </div>
    </section>
    <section class="drawer-section review-progress">
      <h3>설정 진행 상태</h3>
      <div class="progress-item">
        <div class="title"><strong>회사정보 검토</strong><ManagementBadge :value="client.company || '정보 없음'" /></div>
        <div class="progress-bar" aria-hidden="true">
          <div
            class="progress-fill"
            :class="{ complete: client.company === '검토 완료', ongoing: client.company === '검토 중' }"
            ></div>
        </div>
      </div>
      <div class="progress-item">
        <div class="title"><strong>환경정보 검토</strong><ManagementBadge :value="client.environment || '정보 없음'" /></div>
        <div class="progress-bar" aria-hidden="true">
          <div
            class="progress-fill"
            :class="{ complete: client.environment === '검토 완료', ongoing: client.environment === '검토 중' }"
            ></div>
        </div>
      </div>
      <div class="progress-item">
        <div class="title"><strong>적요 및 계정과목 등록</strong><ManagementBadge :value="client.chart || '정보 없음'" /></div>
        <div class="progress-bar" aria-hidden="true">
          <div
            class="progress-fill"
            :class="{ complete: client.chart === '검토 완료', ongoing: client.chart === '검토 중' }"
            ></div>
        </div>
      </div>
    </section>
    <section class="drawer-section">
      <h3>업무 바로가기</h3>
      <button class="link-line" @click="emit('navigate', 'client-work')">업체별 업무 홈 <span>↗</span></button>
      <button v-for="link in clientWorkLinks" :key="link.id" class="link-line" :disabled="!link.enabled" @click="emit('navigate', link.id)">{{ link.title }} <span>{{ link.enabled ? '↗' : '준비 중' }}</span></button>
    </section>
    <template #footer>
      <button v-if="admin" class="btn" @click="emit('assign')">담당자 지정</button>
      <button class="btn primary" @click="emit('navigate', 'client-work')">업무 열기 →</button>
    </template>
  </ManagementDialog>
</template>
