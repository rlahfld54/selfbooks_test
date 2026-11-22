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
<template><Teleport to="body"><dialog data-ui-ui-modal ref="dialog" class="modal" :class="[size, { 'modal-right': placement === 'right' }]" :aria-labelledby="titleId" @cancel.prevent="emit('close')"><header data-ui-ui-modal class="modal-heading"><h2 data-ui-ui-modal :id="titleId">{{ title }}</h2><UiButton data-ui-ui-modal variant="ghost" aria-label="닫기" @click="emit('close')"><UiIcon data-ui-ui-modal name="close" /></UiButton></header><div data-ui-ui-modal class="modal-content"><slot /></div><footer data-ui-ui-modal v-if="$slots.footer" class="modal-footer"><slot name="footer" /></footer></dialog></Teleport></template>
