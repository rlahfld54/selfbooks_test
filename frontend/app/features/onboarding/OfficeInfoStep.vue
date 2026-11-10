<script setup lang="ts">
import type { OfficeInfo } from './types'
defineProps<{ office: OfficeInfo }>()
</script>
<template>
  <div class="ob-fields">
    <label>사무소 이름 <b>*</b><input v-model="office.name" required autocomplete="organization" /></label>
    <label>사업자등록번호 <b>*</b><input v-model="office.registration" required placeholder="123-45-67890" /></label>
    <label>대표 세무사 <b>*</b><input v-model="office.representative" required autocomplete="name" /></label>
    <label>연락처 <b>*</b><input v-model="office.phone" type="tel" required autocomplete="tel" /></label>
    <label class="ob-wide">주소 <b>*</b><input v-model="office.address" required autocomplete="street-address" /></label>
    <label class="ob-wide">이메일<input v-model="office.email" type="email" autocomplete="email" /></label>
  </div>
</template>
