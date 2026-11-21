<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { tabInfo } from '~/utils/workspace-routes'
import { previewSession } from './usePreviewSession'

const { activeTab } = useWorkspaceContext()
const tab = activeTab.value
const { title } = tabInfo(tab.id)
const session = previewSession(tab)
</script>

<template>
  <div>
    <UiCard>
      <EmptyState
        :title="title + ' 업무 화면 준비 중'"
        description="공통 레이아웃과 탭 상태를 확인할 수 있습니다. 실제 업무 기능은 이번 버전에 포함되지 않습니다.">
        <FormField :id="tab.id + '-query'" label="탭별 조회 조건 샘플">
          <UiInput
            :id="tab.id + '-query'"
            v-model="session.query"
            placeholder="탭을 바꾸어도 유지됩니다" />
        </FormField>
      </EmptyState>
    </UiCard>
  </div>
</template>
