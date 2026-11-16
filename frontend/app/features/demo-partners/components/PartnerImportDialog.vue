<script setup lang="ts">
import type { WorkBook } from 'xlsx'
import type { DemoRow } from '../services/mockPartners'
import { MAX_FILE_BYTES, fields, requiredFields, readPartnerWorkbook, previewPartners, preparePartners, type ImportPreview, type ImportedPartner } from '../services/partnerImport'
const props = defineProps<{ existing: (DemoRow & { registration?: string })[]; saving?: boolean; saveError?: string }>()
const emit = defineEmits<{ close: []; dirty: []; register: [rows: ImportedPartner[], batchId: string] }>()
const batchId = ref('')
const workbook = shallowRef<WorkBook>()
const preview = ref<ImportPreview>()
const selectedSheet = ref('')
const filename = ref('')
const error = ref('')
const busy = ref(false)
const page = ref(1)
const errorsOnly = ref(false)
const filteredRows = computed(() => (preview.value?.rows || []).filter(row => !errorsOnly.value || row.errors.length))
const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / 20)))
watch(errorsOnly, () => { page.value = 1 })
const errorCount = computed(() => preview.value?.rows.filter(row => row.errors.length).length || 0)
const warningCount = computed(() => preview.value?.rows.filter(row => row.warnings.length).length || 0)
const visible = computed(() => filteredRows.value.slice((page.value - 1) * 20, page.value * 20))
let request = 0
onBeforeUnmount(() => { request++ })
function inspect() {
  batchId.value = crypto.randomUUID()
  error.value = ''; preview.value = undefined; page.value = 1; errorsOnly.value = false
  try { if (workbook.value) preview.value = previewPartners(workbook.value, selectedSheet.value, props.existing) }
  catch (e) { error.value = e instanceof Error ? e.message : '시트를 읽지 못했습니다.' }
}
async function selectFile(event: Event) {
  if (props.saving) return
  const file = (event.target as HTMLInputElement).files?.[0]
  const token = ++request
  preview.value = undefined; workbook.value = undefined; error.value = ''; filename.value = ''; busy.value = false
  if (!file) return
  emit('dirty')
  if (!/\.xlsx?$/i.test(file.name) || file.size > MAX_FILE_BYTES) { error.value = '5MB 이하의 .xls 또는 .xlsx 파일을 선택하세요.'; return }
  busy.value = true
  try {
    const buffer = await file.arrayBuffer()
    if (token !== request) return
    workbook.value = readPartnerWorkbook(buffer)
    filename.value = file.name
    selectedSheet.value = workbook.value.SheetNames[0] || ''
    inspect()
  } catch { if (token === request) error.value = '파일을 읽지 못했습니다. 암호화·손상 여부와 엑셀 형식을 확인하세요.' }
  finally { if (token === request) busy.value = false }
}
function register() {
  if (!workbook.value || busy.value || props.saving) return
  try {
    const current = previewPartners(workbook.value, selectedSheet.value, props.existing)
    emit('register', preparePartners(current, props.existing), batchId.value)
  } catch (e) { error.value = e instanceof Error ? e.message : '등록하지 못했습니다.' }
}
</script>

<template>
  <UiModal :open="true" title="거래처 엑셀 등록" size="large" @close="!saving && emit('close')">
    <div class="import-content">
      <p class="info-banner">검사 결과를 확인한 뒤 전체 행을 DB에 저장합니다. 오류·경고 사유와 원문도 보존하며, 저장한 거래처는 새로고침 후에도 유지됩니다.</p>
      <p>필수 컬럼: {{ requiredFields.map(([, label]) => label).join(', ') }}. 나머지 컬럼은 생략하거나 비워도 등록할 수 있습니다. 법인등록번호는 빈 값을 허용합니다. 사업자 구분: 1 개인 / 2 법인. 번호·코드는 엑셀에서 텍스트로 입력하세요.</p>
      <label>엑셀 파일 (.xls / .xlsx, 최대 5MB)<input type="file" :disabled="saving" accept=".xls,.xlsx" aria-label="거래처 엑셀 파일" @change="selectFile" /></label>
      <p v-if="busy" role="status">파일을 읽는 중입니다.</p>
      <p v-if="error" role="alert" class="import-error">{{ error }}</p>
      <p v-if="saveError" role="alert" class="import-error">{{ saveError }} 파일을 유지했습니다. 다시 저장할 수 있습니다.</p>
      <template v-if="workbook">
        <label>시트 선택 <select v-model="selectedSheet" :disabled="saving" aria-label="시트 선택" @change="inspect"><option v-for="name in workbook.SheetNames" :key="name">{{ name }}</option></select></label>
        <p>{{ filename }}</p>
      </template>
      <template v-if="preview">
        <p role="status">총 {{ preview.rows.length }}건 · 오류 {{ errorCount }}건 · 확인요망 {{ warningCount }}건</p>
        <p v-if="preview.unknown.length">추가 컬럼도 상세 정보에 보존합니다: {{ preview.unknown.join(', ') }}</p>
        <p v-if="errorCount" class="import-error">오류가 있어도 전체 행을 등록할 수 있습니다. 오류 내용은 등록 후 상세 정보에 남습니다.</p>
        <label><input v-model="errorsOnly" type="checkbox" />오류 행만 보기</label>
        <p>표시 {{ filteredRows.length }}건 / 전체 {{ preview.rows.length }}건 · 필터와 관계없이 전체 행을 등록합니다.</p>
        <p v-if="!filteredRows.length" role="status">오류 행이 없습니다.</p>
        <div class="import-table" tabindex="0" aria-label="엑셀 미리보기 스크롤">
          <table><caption class="sr-only">거래처 엑셀 미리보기</caption><thead><tr><th>엑셀 행</th><th>검사 결과</th><th v-for="field in fields" :key="field[0]">{{ field[1] }}</th><th v-for="(header, i) in preview.headers" v-show="preview.unknown.includes(header)" :key="i">{{ header }}</th></tr></thead>
            <tbody><tr v-for="row in visible" :key="row.line"><td>{{ row.line }}</td><td><span v-if="!row.errors.length && !row.warnings.length">정상</span><div v-for="message in row.errors" :key="message" class="import-error">{{ message }}</div><div v-for="message in row.warnings" :key="message">확인요망: {{ message }}</div></td><td v-for="field in fields" :key="field[0]">{{ row.values[field[0]] || '—' }}</td><td v-for="(header, i) in preview.headers" v-show="preview.unknown.includes(header)" :key="i">{{ row.values[`extra:${i}:${header}`] }}</td></tr></tbody>
          </table>
        </div>
        <div class="import-pages"><UiButton :disabled="page === 1" @click="page--">이전</UiButton><span>{{ page }} / {{ pageCount }}</span><UiButton :disabled="page >= pageCount" @click="page++">다음</UiButton></div>

      </template>
    </div>
    <template #footer><UiButton :disabled="saving" @click="emit('close')">취소</UiButton><UiButton variant="primary" :disabled="busy || saving || !preview" @click="register">{{ saving ? '저장 중…' : `${preview?.rows.length || 0}건 DB에 저장` }}</UiButton></template>
  </UiModal>
</template>

<style scoped>
.import-content { display: grid; gap: 14px; }
.import-content p { margin: 0; }
.import-content label { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.import-content input[type=file] { max-width: 100%; }
.import-table { overflow: auto; max-height: 380px; border: 1px solid var(--border); }
table { border-collapse: collapse; font-size: 13px; width: max-content; }
th, td { padding: 10px; text-align: left; border-bottom: 1px solid var(--border); max-width: 280px; overflow-wrap: anywhere; }
th { position: sticky; top: 0; background: var(--surface, white); }
.import-error { color: #b42318; }
.import-pages { display: flex; justify-content: center; align-items: center; gap: 16px; }
</style>
