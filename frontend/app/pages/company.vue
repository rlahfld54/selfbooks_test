<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
definePageMeta({ workspaceTab: 'company' })
const { navigate } = useWorkspaceContext()
</script>
<template><div class="page-header"><div><div class="eyebrow">ACCOUNTING</div><h1>회사등록</h1><p class="sub">수임업체 관리에서 회사 기본정보를 등록할 수 있습니다.</p></div><button class="btn primary" @click="navigate('clients')">수임업체 관리 →</button></div></template>
