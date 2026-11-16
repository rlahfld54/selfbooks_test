<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { companyPartners } from '../services/mockPartners'
import { demoPartnerDetailSession } from '../composables/useDemoPartnerDetail'
import { partnerListSession } from '../composables/usePartnerListSession'
import { fields } from '../services/partnerImport'

const { company, activeTab } = useWorkspaceContext()
const session = demoPartnerDetailSession(activeTab.value)
const list = partnerListSession(activeTab.value)
const isDatabase = computed(() => activeTab.value.id === 'partners')
const partners = computed(() => isDatabase.value ? list.imported : companyPartners(company.value))
const selectedPartner = computed(() => partners.value.find(row => row.id === session.selected))
const imported = computed(() => list.imported.find(row => row.id === session.selected))
</script>

<template>
  <UiBadge tone="neutral">{{ isDatabase ? 'DB 거래처 정보' : '샘플 정보' }}</UiBadge>
  <div class="detail-identity">
    <span class="detail-avatar"><UiIcon name="users" :size="30" /></span>
    <h2>{{ selectedPartner?.name || '거래처를 선택하세요' }}</h2>
    <p>{{ selectedPartner?.code || '관련 거래처에서 선택할 수 있습니다.' }}</p>
  </div>
  <dl v-if="selectedPartner" class="detail-list">
    <dt>거래처 코드</dt><dd>{{ selectedPartner.code }}</dd>
    <dt>연락처</dt><dd>{{ selectedPartner.contact }}</dd>
    <dt>최근 거래일</dt><dd>{{ selectedPartner.date }}</dd>
    <dt>거래 상태</dt><dd><UiBadge :tone="selectedPartner.status === '확인요망' ? 'warning' : 'success'">{{ selectedPartner.status }}</UiBadge></dd>
  </dl>
  <div v-if="imported?.importIssues.length" class="info-banner"><strong>엑셀 {{ imported.sourceLine }}행 · 확인요망</strong><ul><li v-for="(issue, index) in imported.importIssues" :key="index">{{ issue }}</li></ul></div>
  <dl v-if="imported" class="detail-list">
    <template v-for="field in fields" :key="field[0]"><dt>{{ field[1] }}</dt><dd>{{ imported.information[field[0]] || '—' }}</dd></template>
    <template v-for="(value, key) in imported.information" :key="key"><template v-if="String(key).startsWith('extra:')"><dt>{{ String(key).split(':').slice(2).join(':') }}</dt><dd>{{ value || '—' }}</dd></template></template>
  </dl>
  <h3>관련 거래처</h3>
  <SearchPanel v-model:query="session.query" :items="partners" @select="session.selected = $event.id" />
  <div class="info-banner">{{ isDatabase ? 'DB에서 조회한 거래처 정보입니다.' : '이 패널의 정보는 UI 검증용 샘플입니다.' }}</div>
</template>
