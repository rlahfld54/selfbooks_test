<script setup lang="ts">
// 자료수집 진행 — 화면 아래에 붙는 진행 목록 (이지북스 「자료수집 진행」과 같은 자리).
import { canCancel, canRetry, formatDuration, groupRunItems, runCounts, runFinished, runProgress } from '../logic'
import { kindOf, type CollectionRun, type CollectionRunItem } from '../types'

const props = defineProps<{ run: CollectionRun, hidden: string[], minimized: boolean }>()
const emit = defineEmits<{ retry: [item: CollectionRunItem], hide: [itemId: string], minimize: [], close: [], cancel: [] }>()

const counts = computed(() => runCounts(props.run))
const progress = computed(() => Math.round(runProgress(props.run) * 100))
const finished = computed(() => runFinished(props.run))
const groups = computed(() => groupRunItems(props.run)
  .map(group => ({ ...group, items: group.items.filter(item => !props.hidden.includes(item.id)) }))
  .filter(group => group.items.length))

/* 경과 시간 — 끝나면 멈춘다 */
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | undefined
watch(finished, (done) => {
  clearInterval(ticker)
  if (!done) { ticker = setInterval(() => { now.value = Date.now() }, 1000) }
}, { immediate: true })
onBeforeUnmount(() => clearInterval(ticker))
const elapsed = computed(() => {
  const end = props.run.finishedAt ? Date.parse(props.run.finishedAt) : now.value
  return formatDuration(Math.max(0, end - Date.parse(props.run.startedAt)))
})

const period = computed(() => props.run.from + '~' + props.run.to)
const label = (item: CollectionRunItem) => {
  const kind = kindOf(item.kind)
  return kind?.type === 'bizinfo' ? kind.label : (kind?.label ?? item.kind) + ' (' + period.value + ')'
}
</script>

<template>
  <section
    class="progress-dock"
    :class="{ minimized, failed: counts.failed > 0 }"
    aria-label="자료수집 진행"
    aria-live="polite"
  >
    <header class="dock-head">
      <strong>자료수집 진행</strong>
      <span class="dock-counts">
        진행 {{ counts.running }} · 대기 {{ counts.waiting }} · 완료 {{ counts.done }} · 건너뜀 {{ counts.skipped }}
        · <b :class="{ bad: counts.failed }">실패 {{ counts.failed }}</b>
        <template v-if="counts.cancelled"> · 중단 {{ counts.cancelled }}</template>
      </span>
      <div
        class="dock-bar"
        role="progressbar"
        :aria-valuenow="progress"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span :style="{ '--collection-progress': progress + '%' }" />
      </div>
      <span class="dock-elapsed">{{ finished ? '전체' : '진행' }} {{ elapsed }}</span>
      <UiButton
        v-if="!finished"
        size="small"
        variant="outline"
        :disabled="!canCancel(run)"
        title="대기 중인 작업을 멈춥니다. 지금 받는 종류는 끝까지 받습니다."
        @click="emit('cancel')"
      >
        중단
      </UiButton>
      <UiButton
        size="small"
        variant="outline"
        @click="emit('minimize')"
      >
        {{ minimized ? '펼치기' : '최소화' }}
      </UiButton>
      <UiButton
        size="small"
        variant="outline"
        class="dock-close"
        :disabled="!finished"
        :title="finished ? '' : '수집이 끝나면 닫을 수 있습니다'"
        @click="emit('close')"
      >
        닫기
      </UiButton>
    </header>
    <div
      v-if="!minimized"
      class="dock-body"
    >
      <p
        v-if="!groups.length"
        class="dock-empty"
      >
        표시할 작업이 없습니다.
      </p>
      <div
        v-for="group in groups"
        :key="group.clientId"
        class="dock-group"
      >
        <h4>{{ group.clientName }} <small>{{ group.items.length }}건</small></h4>
        <ul>
          <li
            v-for="item in group.items"
            :key="item.id"
            :class="'item-' + item.status"
          >
            <span
              class="dock-dot"
              :class="item.status"
              :aria-label="item.status"
            />
            <span class="dock-label">{{ label(item) }}</span>
            <span class="dock-message">
              <template v-if="item.status === 'running'">수집 중…</template>
              <template v-else-if="item.status === 'waiting'">대기</template>
              <template v-else>{{ item.message }}</template>
            </span>
            <span class="dock-time">{{ formatDuration(item.durationMs) }}</span>
            <UiButton
              v-if="item.status === 'failed'"
              size="small"
              variant="outline"
              :disabled="!canRetry(item)"
              @click="emit('retry', item)"
            >
              재시도
            </UiButton>
            <button
              type="button"
              class="dock-x"
              :aria-label="label(item) + ' 목록에서 숨기기'"
              :disabled="item.status === 'running' || item.status === 'waiting'"
              @click="emit('hide', item.id)"
            >
              <UiIcon
                name="close"
                :size="14"
              />
            </button>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
