<script setup lang="ts">
const emit = defineEmits<{ cancel: [] }>()
</script>

<template>
  <div class="form-footer">
    <button type="button" class="btn" @click="emit('cancel')">취소</button>
    <button type="submit" class="btn primary">변경사항 저장</button>
  </div>
</template>
