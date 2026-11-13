<script setup lang="ts">
import type { RegistrationReview } from './registrationReview'
const props = defineProps<{ prefix: string; sections: Record<string, readonly string[]>; review: RegistrationReview; sourceNotice?: string }>()
const emit = defineEmits<{ edit: [section: string, field: string, value: string]; confirm: [section: string, confirmed: boolean] }>()
const completed = computed(() => Object.keys(props.sections).filter(section => props.review.reviewed[section]).length)
</script>

<template>
  <div class="review-form">
    <div class="info-banner review-summary" role="status">
      <strong>검토 확인 {{ completed }} / {{ Object.keys(sections).length }}</strong>
      <span>가져온 내용을 확인하고 필요한 값을 수정하세요. 빈 항목은 직접 보완할 수 있습니다.</span>
    </div>
    <p class="muted">{{ sourceNotice || '현재 수집 연결 대기 중입니다. 수정 내용과 검토 확인은 열린 탭에서만 유지되며 서버에 저장되지 않습니다.' }}</p>
    <UiCard v-for="(fields, section, sectionIndex) in sections" :key="section" :title="String(section)">
      <template #actions>
        <UiBadge :tone="review.reviewed[section] ? 'success' : 'neutral'">{{ review.reviewed[section] ? '검토 확인' : review.needsReview[section] ? '재검토 필요' : '검토 대기' }}</UiBadge>
      </template>
      <div class="review-fields">
        <div v-for="(field, index) in fields" :key="field" class="review-field">
          <FormField :id="`${prefix}-${sectionIndex}-${index}`" :label="field">
            <UiInput :id="`${prefix}-${sectionIndex}-${index}`" :model-value="review.values[field]" placeholder="수집 정보가 없으면 직접 입력하세요" @update:model-value="emit('edit', String(section), field, $event)" />
          </FormField>
          <small class="muted">
            <template v-if="Object.hasOwn(review.original, field)">수집 원본: {{ review.original[field] || '값 없음' }}<span v-if="review.values[field] !== review.original[field]"> · 수정됨</span></template>
            <template v-else>{{ review.values[field] ? '직접 입력' : '수집 정보 없음' }}</template>
          </small>
        </div>
      </div>
      <p v-if="section === '첨부/메모'" class="muted">사업자등록증·계약서 첨부는 파일 저장 기능 연결 후 제공됩니다.</p>
      <div class="review-confirm">
        <UiCheckbox :model-value="!!review.reviewed[section]" :label="`${section} 검토 확인`" @update:model-value="emit('confirm', String(section), $event)" />
        <small class="muted">빈 항목과 해당 여부를 포함해 검토했습니다. 값을 수정하면 다시 확인해야 합니다.</small>
      </div>
    </UiCard>
  </div>
</template>

<style scoped>
.review-form, .review-fields { display: flex; flex-direction: column; gap: 20px; }
.review-summary { display: flex; flex-direction: column; gap: 6px; margin: 0; }
.review-fields { max-width: 880px; }
.review-field { display: flex; flex-direction: column; gap: 6px; }
.review-field small { overflow-wrap: anywhere; }
.review-confirm { display: flex; flex-direction: column; gap: 8px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border); }
</style>
