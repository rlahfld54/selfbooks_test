<script setup lang="ts">
import { accounts } from '~/features/vouchers/mockData'
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { accountManagementSession } from './registrationSession'
const { activeTab } = useWorkspaceContext()
const session = accountManagementSession(activeTab.value)
const sections = ['계정과목관리', '거래적요관리', '연결관계'] as const
const rows = computed(() => accounts.filter(item => (item.code + ' ' + item.name).includes(session.query.trim())))
</script>
<template>
  <div>
    <PageToolbar title="계정과목 및 적요관리" description="전표 입력에서 사용하는 기준정보를 확인하세요.">
      <template #eyebrow>기초정보관리</template>
      <UiBadge tone="neutral">화면 시안 · 샘플 기준정보</UiBadge>
    </PageToolbar>
    <UiCard>
      <nav class="section-switcher" aria-label="계정과목 및 적요 구분">
        <UiButton v-for="section in sections" :key="section" :variant="session.section === section ? 'primary' : undefined" :aria-pressed="session.section === section" @click="session.section = section">{{ section }}</UiButton>
      </nav>
      <template v-if="session.section === '계정과목관리'">
        <FormField id="account-query" label="계정과목 검색"><UiInput id="account-query" v-model="session.query" placeholder="코드 또는 계정과목명" /></FormField>
        <div class="account-table">
          <table>
            <caption class="muted">일반전표 Mock 계정과목 · 실제 회사별 DB 마스터와 별개입니다.</caption>
            <thead><tr><th>코드</th><th>계정과목명</th><th>성격</th><th>중분류</th><th>세부속성</th></tr></thead>
            <tbody><tr v-for="row in rows" :key="row.code"><td>{{ row.code }}</td><td>{{ row.name }}</td><td>미설정</td><td>미설정</td><td>미설정</td></tr>
              <tr v-if="!rows.length"><td colspan="5">검색 결과가 없습니다. 검색어를 변경하세요.</td></tr>
            </tbody>
          </table>
        </div>
      </template>
      <EmptyState v-else-if="session.section === '거래적요관리'" title="등록된 거래적요가 없습니다" description="적요코드 · 적요명 · 연결 계정과목을 관리할 영역입니다. 등록 및 저장 기능은 준비 중입니다." />
      <EmptyState v-else title="설정된 연결관계가 없습니다" description="관계계정과 자동분개 매핑을 관리할 영역입니다. 매핑 기준 확정과 저장 API 연결이 필요합니다." />
    </UiCard>
  </div>
</template>
<style scoped>
.account-table { overflow-x: auto; margin-top: 20px; }
table { width: 100%; border-collapse: collapse; min-width: 560px; }
caption { text-align: left; padding-bottom: 12px; }
th, td { text-align: left; padding: 12px; border-bottom: 1px solid var(--border); }
</style>
