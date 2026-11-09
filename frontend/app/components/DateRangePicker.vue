<script setup lang="ts">
defineProps<{ start: string; end: string }>()
defineEmits<{ 'update:start': [value: string]; 'update:end': [value: string] }>()
</script>
<template>
  <div class="date-range">
    <DatePicker
      aria-label="시작일"
      :model-value="start"
      :max="end || undefined"
      @update:model-value="$emit('update:start', $event)"
    /><span>~</span
    ><DatePicker
      aria-label="종료일"
      :model-value="end"
      :min="start || undefined"
      @update:model-value="$emit('update:end', $event)"
    />
  </div>
</template>
