<script setup lang="ts">
import { nextTick, watch, onBeforeUnmount, ref } from 'vue'
const props = withDefaults(defineProps<{ open: boolean; title: string; size?: 'confirm' | 'normal' | 'search' | 'large'; placement?: 'center' | 'right' }>(), { size: 'normal' })
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const titleId = useId()
let previous: HTMLElement | null = null
let oldOverflow = ''
watch(() => props.open, async value => {
 await nextTick()
 if (value && dialog.value && !dialog.value.open) {
  previous = document.activeElement as HTMLElement
  oldOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value.showModal()
  const target = dialog.value.querySelector<HTMLElement>('[data-autofocus]') || dialog.value.querySelector<HTMLElement>('input, select, textarea') || dialog.value.querySelector<HTMLElement>('button')
  target?.focus()
 } else if (!value && dialog.value?.open) {
  dialog.value.close()
  document.body.style.overflow = oldOverflow
  previous?.focus()
 }
}, { immediate: true })
onBeforeUnmount(() => { if (dialog.value?.open) { dialog.value.close(); document.body.style.overflow = oldOverflow; previous?.focus() } })
</script>
<template><Teleport to="body"><dialog ref="dialog" class="modal" :class="[size, { 'modal-right': placement === 'right' }]" :aria-labelledby="titleId" @cancel.prevent="emit('close')"><header class="modal-heading"><h2 :id="titleId">{{ title }}</h2><UiButton variant="ghost" aria-label="닫기" @click="emit('close')"><UiIcon name="close" /></UiButton></header><div class="modal-content"><slot /></div><footer v-if="$slots.footer" class="modal-footer"><slot name="footer" /></footer></dialog></Teleport></template>

<style scoped>
.modal-right {
  margin: 0 0 0 auto;
  height: 100dvh;
  max-height: 100dvh;
  width: min(440px, 100vw);
  max-width: 100vw;
  border-radius: 0;
}
</style>
