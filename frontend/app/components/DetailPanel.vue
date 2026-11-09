<script setup lang="ts">
const props = defineProps<{ open: boolean; width: number; title: string }>()
const emit = defineEmits<{ close: []; 'update:width': [width: number] }>()
const panel = ref<HTMLElement>()
const overlay = ref(false)
let previous: HTMLElement | null = null
let resizeQuery: MediaQueryList | undefined
function updateOverlay() { overlay.value = resizeQuery?.matches ?? false }
function close() { emit('close') }
function key(event: KeyboardEvent) {
 if (!props.open || document.querySelector('dialog[open]')) return
 if (event.key === 'Escape') { event.preventDefault(); close() }
 if (overlay.value && event.key === 'Tab') {
  const items = [...(panel.value?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, [tabindex="0"]') ?? [])]
  const first = items[0], last = items[items.length - 1]
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
 }
}
watch(() => props.open, async value => {
 if (value) { previous = document.activeElement as HTMLElement; await nextTick(); panel.value?.querySelector<HTMLElement>('button')?.focus() }
 else previous?.isConnected && previous.focus()
}, { immediate: true })
onMounted(() => { resizeQuery = matchMedia('(max-width: 1023px)'); updateOverlay(); resizeQuery.addEventListener('change', updateOverlay); document.addEventListener('keydown', key) })
onBeforeUnmount(() => { resizeQuery?.removeEventListener('change', updateOverlay); document.removeEventListener('keydown', key) })
</script>
<template><div v-if="open && overlay" class="panel-backdrop" @click="close" /><aside v-if="open" ref="panel" class="detail-panel" :style="{ width: width + 'px' }" :role="overlay ? 'dialog' : 'complementary'" :aria-modal="overlay || undefined" :aria-label="title"><header class="modal-heading"><div><span class="eyebrow">DETAIL VIEW</span><h2>{{ title }}</h2></div><UiButton variant="ghost" aria-label="상세 패널 닫기" @click="close"><UiIcon name="close" /></UiButton></header><div class="panel-body"><slot /></div><label class="panel-resize">패널 너비 <input type="range" min="320" max="480" step="8" :value="width" @input="emit('update:width', Number(($event.target as HTMLInputElement).value))" /><span>{{ width }}px</span></label></aside></template>

