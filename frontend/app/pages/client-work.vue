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
  <div class="page">
    <header class="page-header">
      <div>
        <div class="eyebrow">
          CLIENT WORKSPACE
        </div><h1>업체별 업무 홈</h1><p class="sub">
          담당 업체를 확인하고 업무를 시작합니다.
        </p>
      </div><NuxtLink
        class="btn"
        to="/client-directory?tab=mine"
      >내 담당 업체 보기</NuxtLink>
    </header>
    <template v-if="client">
      <section class="panel client-overview">
        <div class="section-heading">
          <h2>{{ client.name }}</h2><label>업체 전환 <select
            class="control"
            aria-label="업무 업체 선택"
            :value="client.id"
            @change="switchClient"
          ><option
            v-for="item in accessible"
            :key="item.id"
            :value="item.id"
          >{{ item.name }}</option></select></label>
        </div>
        <p>{{ client.biz }} · {{ client.type }} · {{ assignmentRole(client, user?.id || '') || '관리자 조회' }}</p>
        <p><ManagementBadge :value="client.status" /> · 현재 회계연도 {{ year }}년 <span class="sub">(목업 · 달력 연도 기준)</span></p>
      </section>
      <div class="work-grid">
        <button
          v-for="link in clientWorkLinks"
          :key="link.id"
          class="panel work-card"
          :disabled="!link.enabled"
          @click="navigate(link.id)"
        >
          <strong>{{ link.title }} ↗</strong><span class="sub">{{ link.description }}</span>
        </button>
      </div>
      <p class="sub">
        업체 전환 시 열린 업무 탭을 정리합니다. 담당자 변경·신규 등록은 화면을 이동해도 유지되며 새로고침하면 초기화됩니다.
      </p>
    </template>
    <p
      v-else
      role="status"
    >
      업체가 없거나 접근할 수 없습니다. 담당 업체 목록에서 다시 선택해 주세요.
    </p>
  </div>
</template>

<style scoped>
.client-overview { padding: 24px; margin-bottom: 20px; }
.client-overview p { margin-top: 16px; }
.section-heading { flex-wrap: wrap; gap: 16px; }
.work-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; margin-bottom: 20px; }
.work-card { padding: 24px; text-align: left; cursor: pointer; display: grid; gap: 12px; }
.work-card:disabled { opacity: .6; cursor: not-allowed; }
.work-card:not(:disabled):hover { border-color: #2457C5; background: #EAF1FF; }
</style>
