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
  <div data-ui-dashboard class="page narrow">
    <AssignedClientSummary data-ui-dashboard />
    <div data-ui-dashboard class="stats">
      <div data-ui-dashboard class="panel stat">
        <div data-ui-dashboard class="hint">수임업체</div>
        <strong data-ui-dashboard>{{ data.directory.status === 'success' ? data.clients.length : '—' }}</strong>
      </div>
      <div data-ui-dashboard class="panel stat">
        <div data-ui-dashboard class="hint">소속 직원</div>
        <strong data-ui-dashboard>{{ data.staff.length }}</strong>
      </div>
      <div data-ui-dashboard class="panel stat">
        <div data-ui-dashboard class="hint">검토 필요</div>
        <strong data-ui-dashboard>
          {{
            data.directory.status === 'success' &&
            data.clients.some((client) => client.company || client.environment)
              ? data.clients.filter(needsReview).length
              : '—'
          }}
        </strong>
      </div>
      <div data-ui-dashboard class="panel stat">
        <div data-ui-dashboard class="hint">조직 수</div>
        <strong data-ui-dashboard>1</strong>
      </div>
    </div>
    <div data-ui-dashboard class="panel dashboard-links">
      <h3 data-ui-dashboard>주요 관리 화면</h3>
      <p data-ui-dashboard class="sub">각 메뉴를 클릭하여 업무 흐름을 확인하세요.</p>
      <div data-ui-dashboard class="actions">
        <button data-ui-dashboard class="btn primary" @click="navigate('clients')">수임업체 관리 →</button>
        <button data-ui-dashboard class="btn" @click="navigate('organization')">조직 설정 →</button>
        <button data-ui-dashboard class="btn" @click="navigate('mypage')">마이페이지 →</button>
      </div>
    </div>
  </div>
</template>
