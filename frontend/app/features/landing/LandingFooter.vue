<script setup lang="ts">
import { ref } from 'vue'
import ProductBrand from './ProductBrand.vue'
const policy = ref('')
</script>
<template>
  <footer class="landing-footer"><div><ProductBrand /><p>더 체계적인 세무회계 업무의 시작.</p></div><nav aria-label="하단 메뉴"><a href="#about">서비스 소개</a><button @click="policy = '이용약관'">이용약관 (데모)</button><button @click="policy = '개인정보처리방침'">개인정보처리방침 (데모)</button></nav><small>© 2026 Accounting Pro. UI prototype.</small></footer>
  <UiModal :open="!!policy" :title="`${policy} (데모)`" @close="policy = ''"><p>이 화면은 UI 시연용 안내입니다. 실제 {{ policy }} 문서는 아직 제공되지 않습니다. 실제 개인정보나 업무용 비밀번호 대신 테스트 정보를 입력해 주세요.</p><template #footer><UiButton variant="primary" @click="policy = ''">확인</UiButton></template></UiModal>
</template>
