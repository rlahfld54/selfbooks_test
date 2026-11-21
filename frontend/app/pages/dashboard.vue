<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import AssignedClientSummary from '~/features/management/components/AssignedClientSummary.vue'
import { needsReview } from '~/features/management/assignments'
import { managementSession } from '~/features/management/session'
definePageMeta({ workspaceTab: 'home' })
const { state, navigate } = useWorkspaceContext()
const data = managementSession(state)
</script>
<template>
  <div class="page narrow">
    <AssignedClientSummary />
    <div class="stats">
      <div class="panel stat">
        <div class="hint">수임업체</div>
        <strong>{{ data.directory.status === 'success' ? data.clients.length : '—' }}</strong>
      </div>
      <div class="panel stat">
        <div class="hint">소속 직원</div>
        <strong>{{ data.staff.length }}</strong>
      </div>
      <div class="panel stat">
        <div class="hint">검토 필요</div>
        <strong>
          {{
            data.directory.status === 'success' &&
            data.clients.some((client) => client.company || client.environment)
              ? data.clients.filter(needsReview).length
              : '—'
          }}
        </strong>
      </div>
      <div class="panel stat">
        <div class="hint">조직 수</div>
        <strong>1</strong>
      </div>
    </div>
    <div class="panel dashboard-links">
      <h3>주요 관리 화면</h3>
      <p class="sub">각 메뉴를 클릭하여 업무 흐름을 확인하세요.</p>
      <div class="actions">
        <button class="btn primary" @click="navigate('clients')">수임업체 관리 →</button>
        <button class="btn" @click="navigate('organization')">조직 설정 →</button>
        <button class="btn" @click="navigate('mypage')">마이페이지 →</button>
      </div>
    </div>
  </div>
</template>
<style scoped>
.dashboard-links {
  padding: 24px;
}
.dashboard-links .actions {
  margin-top: 20px;
}
</style>
