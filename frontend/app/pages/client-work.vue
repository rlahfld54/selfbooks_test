<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { useClientAssignments } from '~/features/management/useClientAssignments'
import { assignmentRole } from '~/features/management/assignments'
import { clientWorkLinks } from '~/features/management/client-work'
import ManagementBadge from '~/features/management/ManagementBadge.vue'

definePageMeta({ workspaceTab: 'client-work' })
const { clientId, navigate } = useWorkspaceContext()
const { user, accessible } = useClientAssignments()
const router = useRouter()
const client = computed(() => accessible.value.find(row => row.id === clientId.value))
const year = new Date().getFullYear()
async function switchClient(event: Event) {
  const id = (event.target as HTMLSelectElement).value
  await router.push({ path: '/client-work', query: { clientId: id } })
  ;(event.target as HTMLSelectElement).value = clientId.value
}
</script>

<template>
  <div data-ui-client-work class="page">
    <header data-ui-client-work class="page-header">
      <div data-ui-client-work>
        <div data-ui-client-work class="eyebrow">
          CLIENT WORKSPACE
        </div><h1 data-ui-client-work>업체별 업무 홈</h1><p data-ui-client-work class="sub">
          담당 업체를 확인하고 업무를 시작합니다.
        </p>
      </div><NuxtLink data-ui-client-work
        class="btn"
        to="/client-directory?tab=mine"
      >내 담당 업체 보기</NuxtLink>
    </header>
    <template v-if="client">
      <section data-ui-client-work class="panel client-overview">
        <div data-ui-client-work class="section-heading">
          <h2 data-ui-client-work>{{ client.name }}</h2><label data-ui-client-work>업체 전환 <select data-ui-client-work
            class="control"
            aria-label="업무 업체 선택"
            :value="client.id"
            @change="switchClient"
          ><option data-ui-client-work
            v-for="item in accessible"
            :key="item.id"
            :value="item.id"
          >{{ item.name }}</option></select></label>
        </div>
        <p data-ui-client-work>{{ client.biz || '사업자등록번호 정보 없음' }} · {{ client.type }} · {{ assignmentRole(client, user?.id || '') || '관리자 조회' }}</p>
        <p data-ui-client-work><ManagementBadge data-ui-client-work :value="client.status" /> · 현재 회계연도 {{ year }}년 <span data-ui-client-work class="sub">(목업 · 달력 연도 기준)</span></p>
      </section>
      <div data-ui-client-work class="work-grid">
        <button data-ui-client-work
          v-for="link in clientWorkLinks"
          :key="link.id"
          class="panel work-card"
          :disabled="!link.enabled"
          @click="navigate(link.id)"
        >
          <strong data-ui-client-work>{{ link.title }} ↗</strong><span data-ui-client-work class="sub">{{ link.description }}</span>
        </button>
      </div>
      <p data-ui-client-work class="sub">
        업체 전환 시 열린 업무 탭을 정리합니다. 업체 정보는 실제 조회값입니다. 임시 담당자 배정은 새로고침하면 초기화됩니다.
      </p>
    </template>
    <p data-ui-client-work
      v-else
      role="status"
    >
      업체가 없거나 접근할 수 없습니다. 담당 업체 목록에서 다시 선택해 주세요.
    </p>
  </div>
</template>
