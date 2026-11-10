<script setup lang="ts">
import type { OnboardingData } from './types'
defineProps<{ data: OnboardingData }>()
defineEmits<{ edit: [step: number] }>()
</script>
<template>
  <div class="ob-summary">
    <section><header><h4>사무소 정보</h4><UiButton variant="ghost" aria-label="사무소 정보 수정" @click="$emit('edit', 1)">수정</UiButton></header><strong>{{ data.office.name }}</strong><p>{{ data.office.registration }} · {{ data.office.representative }}</p><p>{{ data.office.phone }} · {{ data.office.email || '이메일 미입력' }}</p><p>{{ data.office.address }}</p></section>
    <section><header><h4>사용자 및 권한 · {{ data.staff.length }}명</h4><UiButton variant="ghost" aria-label="사용자 및 권한 수정" @click="$emit('edit', 2)">수정</UiButton></header><p v-for="person in data.staff" :key="person.id">{{ person.name }} · {{ person.role }} · {{ person.status }}</p><p v-if="!data.staff.length">등록된 사용자 없음</p></section>
    <section><header><h4>업무 기본환경</h4><UiButton variant="ghost" aria-label="업무 기본환경 수정" @click="$emit('edit', 3)">수정</UiButton></header><p>{{ data.settings.year }}년 · {{ data.settings.startMonth }}월 ~ {{ data.settings.endMonth }}월</p><p>{{ data.settings.dateFormat }} · {{ data.settings.amountFormat }}</p><p>시작 화면: {{ data.settings.landing }} · 알림 {{ data.settings.notifications ? '활성화' : '비활성화' }}</p></section>
    <section><header><h4>거래처 등록 · {{ data.clients.length }}개</h4><UiButton variant="ghost" aria-label="거래처 등록 수정" @click="$emit('edit', 4)">수정</UiButton></header><p v-for="client in data.clients" :key="client.id">{{ client.name }} · {{ client.type }} · {{ client.status }}</p><p v-if="!data.clients.length">나중에 등록할 예정입니다.</p></section>
  </div>
</template>
