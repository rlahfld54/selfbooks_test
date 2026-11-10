<script setup lang="ts">
import { previewStats, previewBars, previewTasks } from './mocks'
defineProps<{ compact?: boolean }>()
</script>

<template>
  <div class="product-preview" :class="{ compact }" role="img" aria-label="Accounting Pro 대시보드 미리보기. 모든 수치와 거래처는 가상 데이터입니다.">
    <aside class="preview-sidebar" aria-hidden="true">
      <div class="preview-logo">▥ <strong>Accounting Pro</strong></div>
      <small>WORKSPACE</small>
      <span class="selected"><UiIcon name="home" :size="14" />대시보드</span>
      <span><UiIcon name="users" :size="14" />거래처 관리</span>
      <span><UiIcon name="document" :size="14" />회계 처리</span>
      <span><UiIcon name="chart" :size="14" />세무 신고</span>
      <span><UiIcon name="calendar" :size="14" />업무 일정</span>
      <span class="preview-settings"><UiIcon name="settings" :size="14" />환경설정</span>
    </aside>
    <div class="preview-main" aria-hidden="true">
      <div class="preview-top"><strong>샘플 세무회계사무소 <span>⌄</span></strong><span class="preview-search">⌕ 거래처, 전표 검색</span><span class="preview-avatar">김</span></div>
      <div class="preview-content">
        <div class="preview-greeting"><div><h3>좋은 하루입니다, 김세무님.</h3><p>오늘의 업무 현황을 확인해 보세요.</p></div><span>UI DEMO</span></div>
        <div class="preview-stats"><div v-for="stat in previewStats" :key="stat.label"><p>{{ stat.label }} <UiIcon :name="stat.icon" :size="13" /></p><strong>{{ stat.value }}<small>{{ stat.unit }}</small></strong><span>{{ stat.change }}</span></div></div>
        <div class="preview-charts"><section><header><strong>월별 매출·매입 현황</strong><small><i />매출 <i />매입</small></header><div class="preview-chart"><div v-for="(height, index) in previewBars" :key="index"><i :style="{ height: `${height}%` }" /><i :style="{ height: `${height * 0.65}%` }" /><span>{{ index + 1 }}월</span></div></div></section><section class="preview-schedule"><header><strong>다가오는 업무</strong><UiIcon name="calendar" :size="14" /></header><p><i />매입·매출 자료 확인<small>오늘 · 가나다상사</small></p><p><i />전표 검토 및 정리<small>내일 · ABC테크</small></p><p><i />업무 진행 현황 점검<small>이번 주 · 사무소</small></p></section></div>
        <section class="preview-table"><header><strong>최근 업무 현황</strong><small>전체 보기 →</small></header><div v-for="task in previewTasks" :key="task.name"><strong>{{ task.name }}</strong><span>{{ task.task }}</span><em>{{ task.status }}</em></div></section>
      </div>
    </div>
  </div>
</template>
