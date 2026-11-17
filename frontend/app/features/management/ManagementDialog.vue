<script setup lang="ts">
defineProps<{ label: string; drawer?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()

onMounted(() => dialog.value?.showModal())
onBeforeUnmount(() => dialog.value?.close())

function closeOnBackdrop(event: MouseEvent) {
  const element = dialog.value
  if (!element || event.target !== element) return
  const bounds = element.getBoundingClientRect()
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) emit('close')
}
</script>

<template>
  <dialog
    ref="dialog"
    class="management-dialog"
    :class="drawer ? 'drawer' : 'modal'"
    :aria-label="label"
    @cancel.prevent="emit('close')"
    @click="closeOnBackdrop"
  >
    <header :class="drawer ? 'drawer-head' : 'modal-head'">
      <slot name="heading"><h2>{{ label }}</h2></slot>
      <button type="button" class="icon-btn" aria-label="닫기" @click="emit('close')">✕</button>
    </header>
    <div :class="drawer ? 'drawer-content' : 'modal-body'"><slot /></div>
    <footer :class="drawer ? 'drawer-foot' : 'modal-foot'"><slot name="footer" /></footer>
  </dialog>
</template>
