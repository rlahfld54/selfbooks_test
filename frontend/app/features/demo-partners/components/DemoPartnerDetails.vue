<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { companyPartners } from '../services/mockPartners'
import { demoPartnerDetailSession } from '../composables/useDemoPartnerDetail'

const { company, activeTab } = useWorkspaceContext()
const session = demoPartnerDetailSession(activeTab.value)
const partners = computed(() => companyPartners(company.value))
const selectedPartner = computed(() => partners.value.find(row => row.id === session.selected))
</script>

<template>
  <UiBadge tone="neutral">샘플 정보</UiBadge>
  <div class="detail-identity">
    <span class="detail-avatar"><UiIcon name="users" :size="30" /></span>
    <h2>{{ selectedPartner?.name || '거래처를 선택하세요' }}</h2>
    <p>{{ selectedPartner?.code || '관련 거래처에서 선택할 수 있습니다.' }}</p>
  </div>
  <dl v-if="selectedPartner" class="detail-list">
    <dt>거래처 코드</dt><dd>{{ selectedPartner.code }}</dd>
    <dt>연락처</dt><dd>{{ selectedPartner.contact }}</dd>
    <dt>최근 거래일</dt><dd>{{ selectedPartner.date }}</dd>
    <dt>거래 상태</dt><dd><UiBadge tone="success">{{ selectedPartner.status }}</UiBadge></dd>
  </dl>
  <h3>관련 거래처</h3>
  <SearchPanel v-model:query="session.query" :items="partners" @select="session.selected = $event.id" />
  <div class="info-banner">이 패널의 정보는 UI 검증용 샘플입니다.</div>
</template>
