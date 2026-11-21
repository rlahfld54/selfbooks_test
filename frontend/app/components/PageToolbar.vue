<script setup lang="ts">
import { pageActionsKey } from '~/composables/usePageActions'
const actions = inject(pageActionsKey, null)
const slots = useSlots()
onMounted(() => {
  if (actions) actions.value = slots
})
onBeforeUnmount(() => {
  if (actions?.value === slots) actions.value = null
})
defineProps<{ title?: string; description?: string }>()
</script>
<template>
  <header class="page-toolbar">
    <div v-if="title || description || $slots.eyebrow">
      <div class="eyebrow"><slot name="eyebrow" /></div>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div class="toolbar-actions">
      <slot />
      <template v-if="!actions">
        <CommonPageActions>
          <template v-if="$slots.delete" #delete><slot name="delete" /></template>
        </CommonPageActions>
        <slot name="last" />
      </template>
    </div>
  </header>
</template>
