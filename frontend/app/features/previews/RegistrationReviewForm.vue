<script setup lang="ts">
import type { RegistrationReview } from './registrationReview'
const props = defineProps<{
  prefix: string
  sections: Record<string, readonly string[]>
  review: RegistrationReview
  sourceNotice?: string
}>()
const emit = defineEmits<{
  edit: [section: string, field: string, value: string]
  confirm: [section: string, confirmed: boolean]
}>()
const completed = computed(
  () => Object.keys(props.sections).filter((section) => props.review.reviewed[section]).length,
)
</script>

<template>
  <div data-ui-registration-review-form class="review-form">
    <UiCard data-ui-registration-review-form
      v-for="(fields, section, sectionIndex) in sections"
      :key="section"
      :title="String(section)"
    >
      <template #actions>
        <UiBadge data-ui-registration-review-form :tone="review.reviewed[section] ? 'success' : 'neutral'">{{
          review.reviewed[section]
            ? '검토 확인'
            : review.needsReview[section]
              ? '재검토 필요'
              : '검토 대기'
        }}</UiBadge>
      </template>
      <div data-ui-registration-review-form class="review-fields">
        <div data-ui-registration-review-form v-for="(field, index) in fields" :key="field" class="review-field">
          <FormField data-ui-registration-review-form :id="`${prefix}-${sectionIndex}-${index}`" :label="field">
            <UiInput data-ui-registration-review-form
              :id="`${prefix}-${sectionIndex}-${index}`"
              :model-value="review.values[field]"
              placeholder="수집 정보가 없으면 직접 입력하세요"
              @update:model-value="emit('edit', String(section), field, $event)"
            />
          </FormField>
        </div>
      </div>
      <p data-ui-registration-review-form v-if="section === '첨부/메모'" class="muted">
        사업자등록증·계약서 첨부는 파일 저장 기능 연결 후 제공됩니다.
      </p>
    </UiCard>
  </div>
</template>
