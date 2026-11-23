<script setup lang="ts">
import { formatAmount, normalizeNumericInput } from '~/utils/formatAmount'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  modelValue?: string
  type?: string
  invalid?: boolean
  mode?: 'text' | 'integer' | 'amount' | 'decimal'
  allowNegative?: boolean
  decimalPlaces?: number
  maxIntegerDigits?: number
  grouping?: boolean
  selectOnFocus?: boolean
  revertOnEscape?: boolean
  inputPolicy?: 'normalize' | 'preserve'
}>(), { modelValue: '', type: 'text', mode: 'text', allowNegative: true, inputPolicy: 'normalize' })
const emit = defineEmits<{
  'update:modelValue': [value: string]
  commit: [value: string]
  cancel: [value: string]
}>()
const focused = ref(false)
const composing = ref(false)
const before = ref('')
const numeric = computed(() => props.mode !== 'text')
const decimal = computed(() => props.mode === 'decimal' || props.decimalPlaces !== undefined && props.decimalPlaces > 0)
const display = computed(() => !focused.value && (props.grouping ?? props.mode === 'amount')
  ? formatAmount(props.modelValue, { allowDecimal: decimal.value }) : props.modelValue)
function normalize(value: string) {
  if (!numeric.value) return value
  if (props.inputPolicy === 'preserve') return value.replaceAll(',', '')
  return normalizeNumericInput(value, {
    allowNegative: props.allowNegative, allowDecimal: decimal.value,
    decimalPlaces: props.decimalPlaces, maxIntegerDigits: props.maxIntegerDigits,
  })
}
function update(event: Event) {
  if (composing.value || event instanceof InputEvent && event.isComposing) return
  const input = event.target as HTMLInputElement
  const raw = input.value
  const start = input.selectionStart
  const end = input.selectionEnd
  const value = normalize(raw)
  if (raw !== value) {
    input.value = value
    if (start !== null && end !== null && input.type === 'text') {
      input.setSelectionRange(normalize(raw.slice(0, start)).length, normalize(raw.slice(0, end)).length)
    }
  }
  emit('update:modelValue', value)
}
function endComposition(event: CompositionEvent) {
  composing.value = false
  update(event)
}
async function focus(event: FocusEvent) {
  before.value = props.modelValue
  const input = event.target as HTMLInputElement
  const start = input.selectionStart
  const end = input.selectionEnd
  const raw = input.value
  focused.value = true
  await nextTick()
  if (document.activeElement !== input) return
  if (props.selectOnFocus) input.select()
  else if (numeric.value && start !== null && end !== null && input.type === 'text') {
    input.setSelectionRange(raw.slice(0, start).replaceAll(',', '').length, raw.slice(0, end).replaceAll(',', '').length)
  }
}
function keydown(event: KeyboardEvent) {
  if (event.isComposing || composing.value || event.keyCode === 229) return
  const input = event.target as HTMLInputElement
  if (input.readOnly || input.disabled) return
  if (event.key === 'Enter') emit('commit', props.modelValue)
  if (event.key === 'Escape' && props.revertOnEscape) {
    event.preventDefault()
    input.value = before.value
    emit('update:modelValue', before.value)
    emit('cancel', before.value)
  }
}
</script>
<template>
  <input
    v-bind="{ ...$attrs, ...(numeric ? { inputmode: decimal ? 'decimal' : 'numeric' } : {}) }"
    class="input"
    :class="{ numeric }"
    :type="type"
    :value="display"
    :aria-invalid="invalid || undefined"
    @input="update"
    @compositionstart="composing = true"
    @compositionend="endComposition"
    @focus="focus"
    @blur="focused = false"
    @keydown="keydown"
  />
</template>
