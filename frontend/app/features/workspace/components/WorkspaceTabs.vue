<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import { tabInfo } from '~/utils/workspace-routes'
const { state, navigate, requestClose } = useWorkspaceContext()

async function tabKeys(event: KeyboardEvent, index: number) {
  let target = index
  if (event.key === 'ArrowRight') target = (index + 1) % state.tabs.length
  else if (event.key === 'ArrowLeft') target = (index - 1 + state.tabs.length) % state.tabs.length
  else if (event.key === 'Home') target = 0
  else if (event.key === 'End') target = state.tabs.length - 1
  else if (event.key === 'Delete') {
    event.preventDefault()
    await requestClose(state.tabs[index]!.id)
    await nextTick()
    document.getElementById('tab-' + state.active)?.focus()
    return
  } else return
  event.preventDefault()
  const id = state.tabs[target]!.id
  if (await navigate(id, 'tab')) {
    await nextTick()
    document.getElementById('tab-' + id)?.focus()
  }
}
watch(() => state.active, id =>
  document.getElementById('tab-' + id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' }),
  { flush: 'post' },
)
</script>

<template>
  <div class="tab-bar" role="tablist" aria-label="열린 업무">
    <div
      v-for="(tab, index) in state.tabs"
      :key="tab.id"
      class="work-tab"
      :class="{ active: state.active === tab.id }"
    >
      <button
        :id="'tab-' + tab.id"
        role="tab"
        :aria-controls="state.active === tab.id ? 'page-' + tab.id : undefined"
        :aria-selected="state.active === tab.id"
        :tabindex="state.active === tab.id ? 0 : -1"
        @click="navigate(tab.id, 'tab')"
        @keydown="tabKeys($event, index)"
      >
        <UiIcon :name="tabInfo(tab.id).icon" :size="15" />{{ tabInfo(tab.id).title }}
        <span v-if="tab.dirty" class="dirty-dot" aria-label="미저장 변경" />
      </button>
      <button
        v-if="tab.id !== 'home'"
        class="tab-close"
        :aria-label="tabInfo(tab.id).title + ' 탭 닫기'"
        @click="requestClose(tab.id)"
      >
        <UiIcon name="close" :size="13" />
      </button>
    </div>
  </div>
</template>
