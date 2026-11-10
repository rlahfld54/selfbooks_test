<script setup lang="ts">
import type { BusinessSettings } from './types'
defineProps<{ settings: BusinessSettings }>()
</script>
<template>
  <div class="ob-fields">
    <label>기본 회계연도 <b>*</b><input v-model.number="settings.year" type="number" min="2000" max="2100" required /><small>업무 시작 시 기본으로 선택할 연도입니다.</small></label>
    <div><span class="ob-label">회계기간</span><div class="ob-period"><label><span class="sr-only">시작 월</span><select v-model.number="settings.startMonth"><option v-for="m in 12" :key="m" :value="m">{{ m }}월</option></select></label><span>~</span><label><span class="sr-only">종료 월</span><select v-model.number="settings.endMonth"><option v-for="m in 12" :key="m" :value="m">{{ m }}월</option></select></label></div><small>선택한 연도 내 업무 대상 기간입니다.</small></div>
    <label>날짜 표시 형식<select v-model="settings.dateFormat"><option>YYYY-MM-DD</option><option>YYYY.MM.DD</option><option>YYYY/MM/DD</option></select><small>화면에 날짜를 표시하는 방식입니다.</small></label>
    <label>금액 표시 형식<select v-model="settings.amountFormat"><option>천 단위 구분</option><option>구분 없음</option></select><small>{{ settings.amountFormat === '천 단위 구분' ? '예: 1,234,567원' : '예: 1234567원' }}</small></label>
    <label class="ob-wide">기본 화면<select v-model="settings.landing"><option>대시보드</option><option>일반전표</option></select><small>업무 시작 화면에 대한 설정입니다. 이 프로토타입에서는 선택값만 보관합니다.</small></label>
    <label class="ob-toggle ob-wide"><span><strong>업무 알림</strong><small>주요 일정과 업무 안내를 받아보세요.</small></span><input v-model="settings.notifications" type="checkbox" role="switch" aria-label="알림 활성화" /></label>
  </div>
</template>
