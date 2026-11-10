<script setup lang="ts">
import { features } from './mocks'
</script>
<template>
  <section id="features" class="landing-section">
    <div class="section-heading"><div><span class="section-kicker">BUILT FOR YOUR WORK</span><h2>업무의 시작부터 마무리까지,<br />흩어진 일을 하나의 흐름으로</h2></div><p>익숙한 업무는 더 편리하게.<br />세무회계 전문가에게 필요한 공간을 만들어 갑니다.</p></div>
    <div class="feature-grid"><article v-for="feature in features" :key="feature.title" class="feature-card"><div class="feature-card-top"><span class="feature-icon"><UiIcon :name="feature.icon" :size="23" /></span><small :class="{ planned: feature.status === '준비 중' }">{{ feature.status }}</small></div><h3>{{ feature.title }}</h3><p>{{ feature.description }}</p></article></div>
    <p class="section-footnote">현재는 UI 프로토타입입니다. 준비 중인 기능은 실제 신고·업무 처리를 제공하지 않습니다.</p>
  </section>
</template>
