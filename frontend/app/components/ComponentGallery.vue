<script setup lang="ts">
const text = ref("");
const amount = ref("1500000");
const number = ref("12");
const checked = ref(false);
const radio = ref("a");
const select = ref("a");
const start = ref("2026-11-01");
const end = ref("2026-11-30");
const modal = ref(false);
const confirm = ref(false);
const toast = ref("");
const loading = ref(false);
</script>
<template>
  <div class="component-gallery">
    <PageToolbar
      title="공통 UI 컴포넌트"
      description="새 업무 화면에서 바로 사용할 수 있는 공통 요소입니다."
    /><UiCard title="버튼과 상태"
      ><div class="demo-row">
        <UiButton variant="primary" @click="toast = '기본 버튼을 눌렀습니다.'"
          >Primary</UiButton
        ><UiButton @click="modal = true">Modal 열기</UiButton
        ><UiButton variant="danger" @click="confirm = true"
          >ConfirmDialog</UiButton
        ><UiButton variant="ghost" @click="toast = '알림 샘플입니다.'"
          >Toast</UiButton
        ><UiButton disabled>비활성</UiButton
        ><UiTooltip text="포커스 또는 마우스로 확인하는 도움말"
          ><UiIcon name="help"
        /></UiTooltip>
      </div>
      <div class="demo-row">
        <UiBadge>기본</UiBadge><UiBadge tone="success">완료</UiBadge
        ><UiBadge tone="warning">확인요망</UiBadge
        ><UiBadge tone="danger">오류</UiBadge>
      </div></UiCard
    ><UiCard title="입력 요소"
      ><div class="form-grid">
        <FormField
          id="gallery-text"
          label="Input"
          :error="text.length > 20 ? '20자 이내로 입력하세요.' : undefined"
          v-slot="field"
          ><UiInput
            :id="field.id"
            v-model="text"
            :invalid="text.length > 20"
            :aria-describedby="field.describedby" /></FormField
        ><FormField id="gallery-amount" label="AmountInput" v-slot="field"
          ><AmountInput :id="field.id" v-model="amount" /></FormField
        ><FormField id="gallery-number" label="NumberInput" v-slot="field"
          ><NumberInput :id="field.id" v-model="number" /></FormField
        ><FormField id="gallery-select" label="Select" v-slot="field"
          ><UiSelect
            :id="field.id"
            v-model="select"
            :options="[
              { value: 'a', label: '선택 A' },
              { value: 'b', label: '선택 B' },
            ]"
        /></FormField>
      </div>
      <div class="demo-row">
        <UiCheckbox v-model="checked" label="체크박스" /><UiRadio
          v-model="radio"
          name="gallery-radio"
          value="a"
          label="옵션 A"
        /><UiRadio
          v-model="radio"
          name="gallery-radio"
          value="b"
          label="옵션 B"
        /><DateRangePicker
          v-model:start="start"
          v-model:end="end"
        /></div></UiCard
    ><UiCard title="로딩 · 빈 결과 · 오류"
      ><LoadingState v-if="loading" /><ErrorState
        v-else
        @retry="loading = true" /><UiButton
        v-if="loading"
        @click="loading = false"
        >로딩 데모 종료</UiButton
      ><EmptyState /></UiCard
    ><UiModal :open="modal" title="공통 모달" @close="modal = false"
      ><FormField id="modal-example" label="모달 입력"
        ><UiInput id="modal-example" v-model="text"
      /></FormField>
      <p>Tab 키로 이동하고 Escape 키로 닫을 수 있습니다.</p>
      <template #footer
        ><UiButton @click="modal = false">닫기</UiButton></template
      ></UiModal
    ><ConfirmDialog
      :open="confirm"
      @cancel="confirm = false"
      @confirm="
        confirm = false;
        toast = '확인 동작 샘플입니다.';
      "
    /><UiToast :message="toast" @close="toast = ''" />
  </div>
</template>
