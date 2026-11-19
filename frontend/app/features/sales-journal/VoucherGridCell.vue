<script setup lang="ts">
const props=defineProps<{modelValue:string;label:string;disabled?:boolean}>()
const emit=defineEmits<{'update:modelValue':[value:string]}>()
const before=ref('')
function key(event:KeyboardEvent){if(event.isComposing||event.keyCode===229)return
  if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
    const input=event.target as HTMLInputElement
    if((event.key==='ArrowLeft'&&input.selectionStart===0)||(event.key==='ArrowRight'&&input.selectionEnd===input.value.length)){
      const cells=Array.from(input.closest('tr')?.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input:not([disabled]),select:not([disabled])')??[])
      cells[cells.indexOf(input)+(event.key==='ArrowLeft'?-1:1)]?.focus();event.preventDefault()
    }
  }
  if(event.key==='Escape'){emit('update:modelValue',before.value);(event.target as HTMLInputElement).blur();event.preventDefault()}
  if(event.key==='Enter'||event.key==='ArrowDown'||event.key==='ArrowUp'){
    const target=event.target as HTMLInputElement,td=target.closest('td'),tr=target.closest('tr');if(!td||!tr)return
    if(event.key==='Enter'){const cells=Array.from(tr.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input:not([disabled]),select:not([disabled])'));cells[cells.indexOf(target)+1]?.focus()}
    else{const next=event.key==='ArrowDown'?tr.nextElementSibling:tr.previousElementSibling;next?.children[td.cellIndex]?.querySelector<HTMLInputElement>('input')?.focus()}event.preventDefault()
  }
}
</script>
<template><input :value="modelValue" :aria-label="label" :disabled="disabled" @focus="before=modelValue" @input="emit('update:modelValue',($event.target as HTMLInputElement).value)" @keydown="key" /></template>
<style scoped>input{width:100%;min-width:90px;border:1px solid transparent;background:transparent;padding:2px 0;font:inherit}input:focus{outline:2px solid var(--primary);background:var(--surface)}</style>
