<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { directorySession } from './composables/useDirectorySession'
import { useDirectoryData } from './composables/useDirectoryData'

const { activeTab, company, density, user } = useWorkspaceContext()
const { pagesPreview } = useRuntimeConfig().public
const session = directorySession(activeTab.value)
const { selectedId } = toRefs(session)
const { list: { data, status, error, refresh }, detail } = useDirectoryData(user + ':' + company.value, () => selectedId.value)
const rows = computed(() => (data.value?.data ?? [])
  .filter(row => row.name.includes(session.query.trim())))
const columns = [
  { key: 'name', label: '수임업체명', width: '210px' },
  { key: 'taxpayerKind', label: '납세자 유형', width: '160px' },
  { key: 'status', label: '상태', width: '120px' },
]
</script>
<template>
  <PageToolbar title="수임업체관리" description="개발용 수임업체의 목록과 상세 정보를 조회합니다.">
    <template #eyebrow>WORKSPACE</template>
    <UiBadge tone="neutral">{{ pagesPreview ? '샘플 데이터' : '로컬 개발' }}</UiBadge>
  </PageToolbar>
  <UiCard title="수임업체 목록">
    <div class="search-toolbar">
      <div class="search-input">
        <UiIcon name="search" :size="18" />
        <UiInput v-model="session.query" aria-label="수임업체 검색" placeholder="수임업체명을 검색하세요" />
      </div>
    </div>
    <LoadingState v-if="status === 'pending' || status === 'idle'" />
    <ErrorState v-else-if="error" message="수임업체 목록을 불러오지 못했습니다." @retry="refresh()" />
    <DataTable
      v-else
      :columns="columns"
      :rows="rows"
      :selected="selectedId"
      :density="density" :view-state="session.table"
      caption="수임업체 목록"
      @select="selectedId = String($event.id)"
      @update:density="density = $event"
    />
  </UiCard>
  <UiCard v-if="selectedId" class="section-gap" title="수임업체 상세">
    <LoadingState v-if="detail.status.value === 'pending'" />
    <ErrorState v-else-if="detail.error.value" message="수임업체 상세 정보를 불러오지 못했습니다." @retry="detail.refresh()" />
    <dl v-else-if="detail.data.value?.data?.id === selectedId">
      <dt>수임업체명</dt><dd>{{ detail.data.value.data.name }}</dd>
      <dt>납세자 유형</dt><dd>{{ detail.data.value.data.taxpayerKind }}</dd>
      <dt>상태</dt><dd>{{ detail.data.value.data.status }}</dd>
    </dl>
  </UiCard>
</template>
