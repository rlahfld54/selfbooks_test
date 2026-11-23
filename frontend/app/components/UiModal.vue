<script lang="ts">
// Shared only for open browser dialogs; each document owns its scroll lock.
const dialogLocks = new WeakMap<Document, {
  dialogs: Set<HTMLDialogElement>
  targets: Map<HTMLDialogElement, HTMLElement | null>
  overflow: string
}>()
</script>
<script setup lang="ts">
import { nextTick, watch, onBeforeUnmount, ref, useSlots } from 'vue'
const props = withDefaults(defineProps<{
  open: boolean
  title: string
  description?: string
  size?: 'confirm' | 'normal' | 'search' | 'large'
  placement?: 'center' | 'right'
  appearance?: 'default' | 'management'
  closeOnBackdrop?: boolean
  busy?: boolean
  dirty?: boolean
}>(), { size: 'normal', placement: 'center', appearance: 'default' })
const emit = defineEmits<{ close: [] }>()
const slots = useSlots()
const dialog = ref<HTMLDialogElement>()
const titleId = useId()
const descriptionId = useId()
const discardOpen = ref(false)
let previous: HTMLElement | null = null
let locked: HTMLDialogElement | undefined
let disposed = false
let pressedOutside = false
const management = computed(() => props.appearance === 'management')
const drawer = computed(() => management.value && props.placement === 'right')
function release() {
  if (!locked) return
  const element = locked
  locked = undefined
  const state = dialogLocks.get(element.ownerDocument)
  const wasTop = state && [...state.dialogs].at(-1) === element
  const target = state?.targets.get(element) ?? previous
  // If a parent is removed first, its child must restore focus outside that parent.
  if (state) {
    for (const [child, destination] of state.targets) {
      if (child !== element && destination && element.contains(destination)) state.targets.set(child, target)
    }
    state.targets.delete(element)
  }
  state?.dialogs.delete(element)
  if (state && !state.dialogs.size) {
    element.ownerDocument.body.style.overflow = state.overflow
    dialogLocks.delete(element.ownerDocument)
  }
  const remaining = state && [...state.dialogs].at(-1)
  if (wasTop && target?.isConnected && (!remaining || remaining.contains(target))) target.focus()
  previous = null
}
function requestClose() {
  if (props.busy) return
  if (props.dirty) discardOpen.value = true
  else emit('close')
}
function discard() {
  if (props.busy) return
  discardOpen.value = false
  emit('close')
}
function outside(event: MouseEvent) {
  const element = dialog.value
  if (!element || event.target !== element) return false
  const box = element.getBoundingClientRect()
  return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom
}
function backdrop(event: MouseEvent) {
  if (props.closeOnBackdrop && pressedOutside && outside(event)) requestClose()
  pressedOutside = false
}
function closed() {
  if (dialog.value?.open) return
  release()
  if (props.open && !disposed) emit('close')
}
watch(() => props.open, async open => {
  await nextTick()
  if (disposed || open !== props.open) return
  const element = dialog.value
  if (open && element && !element.open) {
    previous = element.ownerDocument.activeElement as HTMLElement | null
    element.showModal()
    let state = dialogLocks.get(element.ownerDocument)
    if (!state) {
      state = { dialogs: new Set(), targets: new Map(), overflow: element.ownerDocument.body.style.overflow }
      dialogLocks.set(element.ownerDocument, state)
    }
    state.dialogs.add(element)
    state.targets.set(element, previous)
    locked = element
    element.ownerDocument.body.style.overflow = 'hidden'
    const target = element.querySelector<HTMLElement>('[data-autofocus]:not([disabled])')
      || element.querySelector<HTMLElement>('input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
      || element.querySelector<HTMLElement>('button:not([disabled])')
    target?.focus()
  } else if (!open) {
    discardOpen.value = false
    element?.close()
    release()
  }
}, { immediate: true })
onBeforeUnmount(() => {
  disposed = true
  dialog.value?.close()
  release()
})
</script>
<template>
  <Teleport to="body" :disabled="management">
    <dialog
      ref="dialog"
      data-ui-ui-modal
      :class="management ? ['management-dialog', drawer ? 'drawer' : 'modal'] : ['modal', size, { 'modal-right': placement === 'right' }]"
      :aria-label="slots.header ? title : undefined"
      :aria-labelledby="slots.header ? undefined : titleId"
      :aria-describedby="description ? descriptionId : undefined"
      :aria-busy="busy || undefined"
      @cancel.prevent="requestClose"
      @pointerdown="pressedOutside = outside($event)"
      @click="backdrop"
      @close="closed">
      <header :class="management ? drawer ? 'drawer-head' : 'modal-head' : 'modal-heading'">
        <slot name="header"><h2 :id="titleId">{{ title }}</h2></slot>
        <button v-if="management" type="button" class="icon-btn" aria-label="닫기" :disabled="busy" @click="requestClose">✕</button>
        <UiButton v-else variant="ghost" aria-label="닫기" :disabled="busy" @click="requestClose"><UiIcon name="close" /></UiButton>
      </header>
      <div :class="management ? drawer ? 'drawer-content' : 'modal-body' : 'modal-content'">
        <p v-if="description" :id="descriptionId" class="modal-description">{{ description }}</p>
        <slot />
      </div>
      <footer v-if="slots.footer" :class="management ? drawer ? 'drawer-foot' : 'modal-foot' : 'modal-footer'"><slot name="footer" :close="requestClose" /></footer>
    </dialog>
  </Teleport>
  <ConfirmDialog v-if="discardOpen" :open="discardOpen" :busy="busy" title="변경 사항을 버릴까요?" message="저장하지 않은 변경사항이 사라집니다." @cancel="discardOpen = false" @confirm="discard" />
</template>
