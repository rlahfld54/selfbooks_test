<script setup lang="ts">
/*
 * 매입매출전표 상단 — 셀프북스 화면모음 v1-1「매입매출전표입력」(f8) 최신본과 팀장님 front-simple 구현을 따른다.
 * 조회줄(기간/월별 · 전기/차기 · 데이터정렬 · 일괄변경 · 더보기) · 접히는 매출/매입 탭 · 전표 그리드 · 상시 입력행 ·
 * 합계행 · 하단 분개 · 우측 전표정보/거래처정보/불공사유/상태이력.
 * 데이터 · 저장 · 검증은 useSalesJournal(협업 개발자 코드)을 그대로 쓴다.
 */
import type { useSalesJournal } from './composables/useSalesJournal'
import {
  copyDraft,
  createSalesJournalService,
  sumAmounts,
  type SalesRecord,
  type VatType,
} from './services/salesJournal'
import { advancedSearch, type AdvancedFilter } from './services/voucherSearch'
import {
  autoJournal,
  calculateVat,
  emptyMapping,
  supplyFromQuantity,
  type AccountMapping,
} from './services/voucherCalculation'
import {
  BUNGE_LABEL,
  BUNGE_NAME,
  COLLECT_FULL,
  COLLECT_LABEL,
  NONDEDUCT_REASONS,
  NONDEDUCT_TYPES,
  NUMERIC_KEYS,
  SCREEN_TO_JOURNAL,
  TAB_DEFS,
  collectOf,
  dayKind,
  dayTitle,
  defaultJournalType,
  fiscalNavLabel,
  flowOf,
  joinDate,
  lastDay,
  paymentOf,
  reasonText,
  sortRows,
  splitDate,
  tabMatches,
  typeLabel,
  voucherSource,
  zeroVatWarning,
  type SortKey,
} from './services/voucherBoard'
import { useBackendApi } from '~/composables/useBackendApi'
import { formatAmount } from '~/utils/formatAmount'

type Journal = ReturnType<typeof useSalesJournal>
const props = defineProps<{ journal: Journal; pinned: boolean; advanced: AdvancedFilter }>()
const emit = defineEmits<{ search: []; editor: [] }>()
const checked = defineModel<string[]>('checked', { required: true })
const density = defineModel<string>('density', { default: 'normal' })
const journal = props.journal
const { session, meta, rows, locked, busy, loading, pagesPreview, partnerName, filterError, tab } =
  journal
const service = pagesPreview ? null : createSalesJournalService(useBackendApi(15000))

/* ── 유형 ── */
// 공개 미리보기에는 서버 유형 목록이 없어 백엔드 sales-domain 의 사용 가능 유형을 그대로 옮겨 쓴다
const PREVIEW_TYPES: VatType[] = (
  [
    ['11', '과세', 'taxable'],
    ['12', '영세', 'zero'],
    ['13', '면세', 'exempt'],
    ['14', '건별', 'taxable'],
    ['16', '수출', 'zero'],
    ['17', '카과', 'taxable'],
    ['18', '카면', 'exempt'],
    ['19', '카영', 'zero'],
    ['22', '현과', 'taxable'],
    ['23', '현면', 'exempt'],
    ['24', '현영', 'zero'],
    ['51', '과세', 'taxable'],
    ['52', '영세', 'zero'],
    ['53', '면세', 'exempt'],
    ['54', '불공', 'taxable'],
    ['57', '카과', 'taxable'],
    ['58', '카면', 'exempt'],
    ['59', '카영', 'zero'],
    ['61', '현과', 'taxable'],
    ['62', '현면', 'exempt'],
  ] as const
).map(([code, name, taxCategory]) => ({
  code,
  name,
  taxCategory,
  direction: Number(code) < 50 ? 'sales' : 'purchase',
  enabled: true,
}))
const types = computed(() => (meta.value?.vatTypes ?? PREVIEW_TYPES).filter((type) => type.enabled))
const label = (code: string) => typeLabel(code, meta.value?.vatTypes)

/* ── 조회줄: 기간 / 월별 ── */
const mode = ref<'range' | 'month'>('range')
const range = reactive({
  fromYear: '',
  fromMonth: '',
  fromDay: '',
  toYear: '',
  toMonth: '',
  toDay: '',
})
const month = reactive({ year: '', month: '', day: '' })
watch(
  () => [session.filter.from, session.filter.to],
  ([from, to]) => {
    const a = splitDate(from ?? ''),
      b = splitDate(to ?? '')
    Object.assign(range, {
      fromYear: a.year,
      fromMonth: a.month,
      fromDay: a.day,
      toYear: b.year,
      toMonth: b.month,
      toDay: b.day,
    })
    if (!month.year || month.year !== a.year)
      Object.assign(month, { year: a.year, month: month.month || a.month })
  },
  { immediate: true },
)
function periodFromInputs() {
  if (mode.value === 'month') {
    if (month.day) {
      const day = joinDate(month.year, month.month, month.day)
      return day ? { from: day, to: day } : null
    }
    const from = joinDate(month.year, month.month, '1'),
      to = joinDate(month.year, month.month, String(lastDay(month.year, month.month)))
    return from && to ? { from, to } : null
  }
  const from = joinDate(range.fromYear, range.fromMonth, range.fromDay),
    to = joinDate(range.toYear, range.toMonth, range.toDay)
  return from && to ? { from, to } : null
}
function search() {
  const period = periodFromInputs()
  if (!period) {
    filterError.value = '조회기간의 년 · 월 · 일을 확인하세요.'
    return
  }
  Object.assign(session.filter, period)
  void journal.queryRecords()
}
function shiftMonth(delta: number) {
  const date = new Date(Number(month.year), Number(month.month) - 1 + delta, 1)
  month.year = String(date.getFullYear())
  month.month = String(date.getMonth() + 1).padStart(2, '0')
  search()
}

/* ── 전기 / 차기 (화면모음 fiscalYearNav) ── */
const thisYear = new Date().getFullYear()
const nav = reactive<{ dir: 'prev' | 'next' | ''; count: number }>({ dir: '', count: 0 })
const viewYear = computed(
  () => Number(mode.value === 'month' ? month.year : range.fromYear) || thisYear,
)
function shiftYear(delta: -1 | 1) {
  const target = viewYear.value + delta
  if (target < thisYear - 2 || target > thisYear) return
  const dir = delta < 0 ? 'prev' : 'next'
  nav.count = nav.dir === dir ? nav.count + 1 : 1
  nav.dir = dir
  const move = (year: string) => (year ? String(Number(year) + delta) : year)
  range.fromYear = move(range.fromYear)
  range.toYear = move(range.toYear)
  month.year = move(month.year)
  search()
}
const navBadge = computed(() =>
  nav.dir
    ? `${nav.dir === 'prev' ? '◀ ' : ''}${fiscalNavLabel(nav.dir, nav.count)} ${viewYear.value}년 조회중${nav.dir === 'next' ? ' ▶' : ''}`
    : '',
)

/* ── 탭: 전체 · 전체매출/전체매입만 보이고 ▼ 로 나머지를 편다 ── */
const activeTab = ref('all')
const tabsOpen = ref(false)
const baseRows = computed(() => advancedSearch(rows.value, props.advanced))
const tabCount = computed(() =>
  Object.fromEntries(
    TAB_DEFS.map((def) => [def.key, baseRows.value.filter((row) => tabMatches(def, row)).length]),
  ),
)
const tabLines = computed(() =>
  (['sale', 'purchase'] as const).map((flow) => {
    const defs = TAB_DEFS.filter((def) => def.flow === flow)
    return {
      flow,
      name: flow === 'sale' ? '매출' : '매입',
      defs: tabsOpen.value
        ? defs
        : defs.filter((def) => def.key.endsWith('-all') || def.key === activeTab.value),
    }
  }),
)
const tabRows = computed(() => {
  const def = TAB_DEFS.find((item) => item.key === activeTab.value)
  return def ? baseRows.value.filter((row) => tabMatches(def, row)) : baseRows.value
})

/* ── 정렬: 데이터정렬(입력순/날짜순) + 헤더 클릭 ── */
const order = ref<'input' | 'date'>('input'),
  sortOpen = ref(false),
  sortChoice = ref<'input' | 'date'>('input')
const sort = reactive<{ key: SortKey | ''; dir: 1 | -1 }>({ key: '', dir: 1 })
function applyOrder() {
  order.value = sortChoice.value
  sort.key = ''
  sortOpen.value = false
}
function toggleSort(key: SortKey) {
  if (sort.key === key) sort.dir = sort.dir === 1 ? -1 : 1
  else Object.assign(sort, { key, dir: 1 })
}
const bizNo = (row: SalesRecord) =>
  meta.value?.partners.find((partner) => partner.id === row.partnerId)?.businessNumber ?? ''
const partnerCode = (id: string) =>
  meta.value?.partners.find((partner) => partner.id === id)?.code ?? ''
function cellValue(row: SalesRecord, key: SortKey) {
  switch (key) {
    case 'total':
      return sumAmounts([row.supply, row.vat])
    case 'quantity':
      return row.quantity ?? '1'
    case 'unitPrice':
      return row.unitPrice ?? '0'
    case 'bizNo':
      return bizNo(row)
    case 'collect':
      return COLLECT_LABEL[collectOf(row)]
    case 'journal':
      return row.journalType ?? ''
    case 'partnerCode':
      return row.partnerCode
    case 'date':
      return row.date
    case 'type':
      return row.type
    case 'item':
      return row.item
    case 'supply':
      return row.supply
    case 'vat':
      return row.vat
    case 'partner':
      return row.partner
  }
}
const visibleRows = computed(() => {
  let list = tabRows.value
  if (order.value === 'date') list = sortRows(list, (row) => row.date, false, 1)
  if (sort.key) {
    const key = sort.key
    list = sortRows(list, (row) => cellValue(row, key), NUMERIC_KEYS.includes(key), sort.dir)
  }
  return list
})
defineExpose({ visibleRows })

/* ── 선택 행: 편집 중이면 입력값을 보여 준다 ── */
const isSelected = (row: SalesRecord) => session.selected === row.id
const editable = (row: SalesRecord) => isSelected(row) && !locked.value
function shown(row: SalesRecord): SalesRecord {
  if (!isSelected(row)) return row
  const draft = session.draft
  return {
    ...row,
    type: draft.type,
    item: draft.item,
    supply: draft.supply,
    vat: draft.vat,
    partnerId: draft.partnerId,
    partner: partnerName.value || row.partner,
    partnerCode: partnerCode(draft.partnerId) || row.partnerCode,
    journalType: draft.journalType,
    electronic: draft.electronic,
    nonDeductionReason: draft.nonDeductionReason,
    lines: draft.lines,
  }
}
function pick(row: SalesRecord) {
  if (!props.pinned) journal.select(row)
}
const digitsOnly = (value: string) => value.replace(/[^\d]/g, '')
function amountInput(field: 'supply' | 'vat', event: Event) {
  session.draft[field] = digitsOnly((event.target as HTMLInputElement).value)
  journal.taxEdit()
}
function typeChanged() {
  journal.taxEdit()
  if (NONDEDUCT_TYPES.includes(session.draft.type)) openReason('row')
  else session.draft.nonDeductionReason = ''
}

/* ── 그리드 분개 칸: 1~5 직접입력 · F2 목록 (화면모음 bungeGridEdit) ── */
const rowError = ref('')
const bungeOpen = ref<'row' | 'draft' | ''>('')
function setRowBunge(screen: string) {
  rowError.value = ''
  const journalType = SCREEN_TO_JOURNAL[screen]
  if (!journalType) {
    rowError.value = '분개는 1(현금) · 2(외상) · 3(혼합) · 4(카드) · 5(분개없음) 중에서 입력하세요.'
    return
  }
  session.draft.journalType = journalType
  session.draft.payment = paymentOf(journalType)
  const type = types.value.find((item) => item.code === session.draft.type)
  try {
    session.draft.lines =
      journalType === '0'
        ? []
        : type
          ? autoJournal(session.draft, type, loadMapping())
          : session.draft.lines
  } catch (failure) {
    rowError.value = `${failure instanceof Error ? failure.message : '분개를 다시 만들지 못했습니다.'} 하단 「분개 상세」에서 직접 입력하세요.`
  }
  journal.edit()
}
function pickBunge(screen: string) {
  if (bungeOpen.value === 'draft') draft.bunge = screen
  else setRowBunge(screen)
  bungeOpen.value = ''
}

/* ── 합계행: 같은 거래처 · 체크 선택 · 전체 ── */
const selectedRow = computed(() => session.rows.find((row) => row.id === session.selected))
const samePartnerRows = computed(() => {
  const target = selectedRow.value
  if (!target) return []
  return visibleRows.value.filter((row) =>
    target.partnerCode ? row.partnerCode === target.partnerCode : row.partner === target.partner,
  )
})
const checkedRows = computed(() =>
  visibleRows.value.filter((row) => checked.value.includes(row.id)),
)
const total = (list: SalesRecord[]) => ({
  supply: sumAmounts(list.map((row) => row.supply)),
  vat: sumAmounts(list.map((row) => row.vat)),
  sum: sumAmounts(list.flatMap((row) => [row.supply, row.vat])),
})
const allChecked = computed(
  () =>
    visibleRows.value.length > 0 &&
    visibleRows.value.every((row) => checked.value.includes(row.id)),
)
function toggleAll() {
  checked.value = allChecked.value
    ? checked.value.filter((id) => !visibleRows.value.some((row) => row.id === id))
    : [...new Set([...checked.value, ...visibleRows.value.map((row) => row.id)])]
}

/* ── 상시 입력행: 년은 조회연도(전기/차기를 따라감) · 월/일부터 Enter 로 다음 칸 · 분개 칸 Enter 로 저장 ── */
const draft = reactive({
  month: '',
  day: '',
  type: '',
  item: '',
  qty: '',
  unit: '',
  supply: '',
  partnerId: '',
  bunge: '',
  reason: '',
})
const draftError = ref(''),
  draftPartnerOpen = ref(false)
const draftYear = computed(() => String(viewYear.value))
const draftPartner = computed(() =>
  meta.value?.partners.find((partner) => partner.id === draft.partnerId),
)
const draftType = computed(() => types.value.find((type) => type.code === draft.type))
watch(
  () => draft.type,
  (code) => {
    if (NONDEDUCT_TYPES.includes(code) && types.value.some((type) => type.code === code))
      openReason('draft')
    else draft.reason = ''
  },
)
const draftSupply = computed(() => {
  if (draft.supply) return digitsOnly(draft.supply)
  try {
    return draft.qty && draft.unit ? supplyFromQuantity(draft.qty, draft.unit) : ''
  } catch {
    return ''
  }
})
const draftVat = computed(() => {
  try {
    return draftType.value && draftSupply.value
      ? calculateVat(draftSupply.value, draftType.value.taxCategory)
      : ''
  } catch {
    return ''
  }
})
const DRAFT_ORDER = ['month', 'day', 'type', 'item', 'qty', 'unit', 'supply', 'partner', 'bunge']
function draftKey(event: KeyboardEvent, key: string) {
  if (event.key === 'F2' && key === 'partner') {
    event.preventDefault()
    draftPartnerOpen.value = true
    return
  }
  if (event.key === 'F2' && key === 'bunge') {
    event.preventDefault()
    bungeOpen.value = 'draft'
    return
  }
  if (event.key !== 'Enter') return
  event.preventDefault()
  if (key === 'partner' && !draft.partnerId) {
    draftPartnerOpen.value = true
    return
  }
  const index = DRAFT_ORDER.indexOf(key)
  if (index === DRAFT_ORDER.length - 1) {
    void commitDraft()
    return
  }
  const next = (event.currentTarget as HTMLElement)
    .closest('tr')
    ?.querySelector<HTMLInputElement>(`[data-df="${DRAFT_ORDER[index + 1]}"]`)
  next?.focus()
  next?.select?.()
}
function pickDraftPartner(row: { id: string }) {
  draft.partnerId = row.id
  draftPartnerOpen.value = false
  nextTick(() => document.querySelector<HTMLInputElement>('[data-df="bunge"]')?.focus())
}
function loadMapping(): AccountMapping {
  const mapping = emptyMapping(),
    info = meta.value
  if (!info) return mapping
  try {
    const saved = JSON.parse(
      localStorage.getItem(
        `aat:sales-settings:v1:${info.user}:${info.companyId ?? info.company}:${info.establishmentId ?? info.establishment}`,
      ) ?? 'null',
    )
    for (const name of Object.keys(mapping) as (keyof AccountMapping)[]) {
      if (info.accounts.some((account) => account.id === saved?.mapping?.[name]))
        mapping[name] = saved.mapping[name]
    }
  } catch {
    /* 설정이 없으면 빈 값 — 아래에서 안내한다 */
  }
  return mapping
}
async function commitDraft() {
  draftError.value = ''
  const info = meta.value
  const fail = (message: string) => {
    draftError.value = message
  }
  if (!info || busy.value || loading.value) return
  if (tab.dirty) return fail('편집 중인 전표를 먼저 저장하거나 취소하세요.')
  const date = joinDate(draftYear.value, draft.month, draft.day)
  if (!date) return fail('월 · 일을 확인하세요.')
  const type = draftType.value
  if (!type) return fail('사용할 수 있는 유형코드를 입력하세요.')
  if (!draft.item.trim()) return fail('품목을 입력하세요.')
  if (!draftSupply.value || !/^\d+$/.test(draftSupply.value))
    return fail('공급가액 또는 수량 · 단가를 입력하세요.')
  if (!draftVat.value)
    return fail('이 유형은 세액 계산 규칙이 확인되지 않았습니다. 아래 상세 편집에서 입력하세요.')
  if (!draft.partnerId) return fail('거래처를 선택하세요. 거래처코드 칸에서 F2 를 누르세요.')
  if (NONDEDUCT_TYPES.includes(type.code) && !draft.reason) {
    openReason('draft')
    return fail('불공제 사유를 선택하세요.')
  }
  const journalType = draft.bunge ? SCREEN_TO_JOURNAL[draft.bunge] : defaultJournalType(type.code)
  if (!journalType)
    return fail('분개는 1(현금) · 2(외상) · 3(혼합) · 4(카드) · 5(분개없음) 중에서 입력하세요.')
  const period = info.periods.find((item) => item.start <= date && date <= item.end)
  if (!period) return fail('회계기간 밖의 날짜입니다.')
  if (period.status === 'closed') return fail('마감된 회계기간입니다.')

  journal.reset()
  Object.assign(session.draft, {
    date,
    periodId: period.id,
    type: type.code,
    item: draft.item.trim(),
    quantity: draft.qty || '1',
    unitPrice: draft.unit || '0',
    supply: draftSupply.value,
    vat: draftVat.value,
    partnerId: draft.partnerId,
    electronic: false,
    journalType,
    payment: paymentOf(journalType),
    memo: '',
    nonDeductionReason: draft.reason ? reasonText(draft.reason) : '',
  })
  let lines: typeof session.draft.lines = []
  let lineProblem = ''
  if (journalType !== '0') {
    try {
      lines = autoJournal(session.draft, type, loadMapping())
    } catch (failure) {
      lineProblem = failure instanceof Error ? failure.message : '분개를 만들지 못했습니다.'
    }
  }
  session.draft.lines = lines

  if (pagesPreview) {
    const record: SalesRecord = {
      ...copyDraft(session.draft),
      version: 1,
      partner: draftPartner.value?.name ?? '',
      partnerCode: draftPartner.value?.code ?? '',
      status: 'draft',
      entryNumber: `PREVIEW-${session.rows.length + 1}`,
      needsReview: false,
    }
    session.rows.push(record)
    journal.reset()
    journal.select(record)
  } else {
    if (lineProblem) {
      journal.edit()
      emit('editor')
      return fail(`${lineProblem} 아래 「분개 상세」에서 분개를 입력한 뒤 저장하세요.`)
    }
    await journal.save()
    if (journal.error.value) {
      emit('editor')
      return
    }
  }
  if (date < session.filter.from || date > session.filter.to) {
    if (date < session.filter.from) session.filter.from = date
    if (date > session.filter.to) session.filter.to = date
    session.applied = { ...session.applied, from: session.filter.from, to: session.filter.to }
  }
  const def = TAB_DEFS.find((item) => item.key === activeTab.value)
  if (def && !tabMatches(def, { type: type.code, electronic: false })) activeTab.value = 'all'
  Object.assign(draft, {
    type: '',
    item: '',
    qty: '',
    unit: '',
    supply: '',
    partnerId: '',
    bunge: '',
    reason: '',
  })
  if (lineProblem) draftError.value = `미리보기: ${lineProblem}`
}

/* ── 불공제사유 팝업 (12종) ── */
const reasonTarget = ref<'row' | 'draft' | ''>(''),
  reasonPick = ref('')
function openReason(target: 'row' | 'draft') {
  reasonTarget.value = target
  const current = target === 'draft' ? draft.reason : (session.draft.nonDeductionReason ?? '')
  reasonPick.value =
    NONDEDUCT_REASONS.find((reason) => current.startsWith(`${reason.code}.`))?.code ?? ''
}
function confirmReason() {
  if (!reasonPick.value) return
  if (reasonTarget.value === 'draft') draft.reason = reasonPick.value
  else {
    session.draft.nonDeductionReason = reasonText(reasonPick.value)
    journal.edit()
  }
  reasonTarget.value = ''
}

/* ── 일괄변경 (화면모음 bulkChangePopup) — 체크한 섹션만 적용 ── */
const bulkOpen = ref(false),
  bulkBusy = ref(false),
  bulkMessage = ref('')
const bulk = reactive({
  s1: false,
  s2: false,
  s3: false,
  s4: false,
  s5: false,
  debit: '',
  credit: '',
  itemMode: '0',
  item: '',
  memoMode: '0',
  memo: '',
  deduct: '2',
  type: '57',
  journal: '0',
  debitPartner: '',
  creditPartner: '',
})
const bulkTargets = computed(() =>
  checkedRows.value.length ? checkedRows.value : selectedRow.value ? [selectedRow.value] : [],
)
function openBulk() {
  bulkMessage.value = ''
  Object.assign(bulk, { s1: false, s2: false, s3: false, s4: false, s5: false })
  bulkOpen.value = true
}
async function applyBulk() {
  bulkMessage.value = ''
  if (![bulk.s1, bulk.s2, bulk.s3, bulk.s4, bulk.s5].some(Boolean)) {
    bulkMessage.value = '변경할 항목을 왼쪽 체크박스에서 선택해 주세요.'
    return
  }
  if (!bulkTargets.value.length) {
    bulkMessage.value = '변경할 전표를 체크하거나 선택하세요.'
    return
  }
  if (bulk.s2 || bulk.s3 || bulk.s4 || bulk.s5 || (bulk.s1 && (bulk.debit || bulk.credit))) {
    bulkMessage.value =
      '계정과목 · 공제여부 · 유형 · 분개 · 거래처 일괄변경은 서버 저장 규칙이 확정된 뒤 연결됩니다. 지금은 품목 · 적요만 적용할 수 있습니다.'
    return
  }
  const changes: Record<string, string>[] = []
  if (bulk.itemMode === '1') changes.push({ item: bulk.item.trim() })
  if (bulk.memoMode === '1') changes.push({ memo: bulk.memo.trim() })
  if (!changes.length) {
    bulkMessage.value = '품목 또는 적요를 「1.지정」으로 바꾸고 값을 입력하세요.'
    return
  }
  if (!service || tab.dirty) {
    bulkMessage.value = pagesPreview
      ? '공개 미리보기에서는 저장하지 않습니다.'
      : '미저장 내용을 먼저 저장하세요.'
    return
  }
  bulkBusy.value = true
  try {
    for (const change of changes) await service.batch('bulk', bulkTargets.value, change)
    bulkOpen.value = false
    await journal.load()
  } catch (failure) {
    bulkMessage.value = failure instanceof Error ? failure.message : '일괄변경하지 못했습니다.'
  } finally {
    bulkBusy.value = false
  }
}

/* ── 하단 분개 · 우측 패널 ── */
const lineRows = computed(() => (session.selected ? session.draft.lines : []))
const account = (id: string) => meta.value?.accounts.find((item) => item.id === id)
const isCounterpart = (side: 'debit' | 'credit') =>
  flowOf(session.draft.type) === 'sale' ? side === 'debit' : side === 'credit'
const lineTotals = computed(() => ({
  debit: sumAmounts(
    lineRows.value.filter((line) => line.side === 'debit').map((line) => line.amount),
  ),
  credit: sumAmounts(
    lineRows.value.filter((line) => line.side === 'credit').map((line) => line.amount),
  ),
}))
const sideInfo = computed(() => {
  const row = selectedRow.value
  if (!row) return null
  const current = shown(row)
  return {
    code: current.partnerCode,
    name: current.partner,
    bizNo: bizNo(current),
    entry: row.entryNumber,
    source: voucherSource(current),
    collect: COLLECT_FULL[collectOf(current)],
    status: row.status === 'posted' ? '확정' : '미확정',
    review: zeroVatWarning(current, meta.value?.vatTypes),
  }
})
const panels = reactive({ meta: true, partner: true, reason: true, history: false })
const history = ref<{ action: string; actor: string; createdAt: string }[]>([]),
  historyError = ref('')
const ACTION_LABEL: Record<string, string> = {
  create: '등록',
  update: '수정',
  delete: '삭제',
  restore: '복원',
}
watch(
  () => [session.selected, panels.history] as const,
  async ([id, open]) => {
    history.value = []
    historyError.value = ''
    if (!id || !open || !service) return
    try {
      history.value = (await service.history(id)).data
    } catch {
      historyError.value = '이력을 불러오지 못했습니다.'
    }
  },
)
const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
  { key: 'type', label: '유형' },
  { key: 'item', label: '품목' },
  { key: 'quantity', label: '수량', numeric: true },
  { key: 'unitPrice', label: '단가', numeric: true },
  { key: 'supply', label: '공급가액', numeric: true },
  { key: 'vat', label: '세액', numeric: true },
  { key: 'total', label: '합계', numeric: true },
  { key: 'partnerCode', label: '거래처코드' },
  { key: 'partner', label: '거래처명' },
  { key: 'bizNo', label: '사업자(주민)등록번호' },
  { key: 'collect', label: '자료수집' },
  { key: 'journal', label: '분개' },
]
const datePart = (part: string) => String(Number(part))
</script>

<template>
  <section data-ui-sales-voucher-board class="vb" aria-label="매입매출전표 조회">
    <form data-ui-sales-voucher-board class="vb-query" @submit.prevent="search">
      <div data-ui-sales-voucher-board class="vb-toggle" role="group" aria-label="조회 방식">
        <button
          data-ui-sales-voucher-board
          type="button"
          :aria-pressed="mode === 'range'"
          @click="mode = 'range'">
          기간
        </button>
        <button
          data-ui-sales-voucher-board
          type="button"
          :aria-pressed="mode === 'month'"
          @click="mode = 'month'">
          월별
        </button>
      </div>
      <template v-if="mode === 'range'">
        <span data-ui-sales-voucher-board class="vb-caption">조회기간</span>
        <input
          data-ui-sales-voucher-board
          v-model="range.fromYear"
          class="vb-num y"
          maxlength="4"
          inputmode="numeric"
          aria-label="조회 시작 년" />
        <i data-ui-sales-voucher-board>년</i>
        <input
          data-ui-sales-voucher-board
          v-model="range.fromMonth"
          class="vb-num"
          maxlength="2"
          inputmode="numeric"
          aria-label="조회 시작 월" />
        <i data-ui-sales-voucher-board>월</i>
        <input
          data-ui-sales-voucher-board
          v-model="range.fromDay"
          class="vb-num"
          maxlength="2"
          inputmode="numeric"
          aria-label="조회 시작 일" />
        <i data-ui-sales-voucher-board>일</i>
        <span data-ui-sales-voucher-board class="vb-tilde">~</span>
        <input
          data-ui-sales-voucher-board
          v-model="range.toYear"
          class="vb-num y"
          maxlength="4"
          inputmode="numeric"
          aria-label="조회 종료 년" />
        <i data-ui-sales-voucher-board>년</i>
        <input
          data-ui-sales-voucher-board
          v-model="range.toMonth"
          class="vb-num"
          maxlength="2"
          inputmode="numeric"
          aria-label="조회 종료 월" />
        <i data-ui-sales-voucher-board>월</i>
        <input
          data-ui-sales-voucher-board
          v-model="range.toDay"
          class="vb-num"
          maxlength="2"
          inputmode="numeric"
          aria-label="조회 종료 일" />
        <i data-ui-sales-voucher-board>일</i>
      </template>
      <template v-else>
        <button
          data-ui-sales-voucher-board
          type="button"
          class="vb-btn icon"
          aria-label="이전 달"
          @click="shiftMonth(-1)">
          ◀
        </button>
        <input
          data-ui-sales-voucher-board
          v-model="month.year"
          class="vb-num y"
          maxlength="4"
          inputmode="numeric"
          aria-label="조회 년" />
        <i data-ui-sales-voucher-board>년</i>
        <input
          data-ui-sales-voucher-board
          v-model="month.month"
          class="vb-num"
          maxlength="2"
          inputmode="numeric"
          aria-label="조회 월" />
        <i data-ui-sales-voucher-board>월</i>
        <button
          data-ui-sales-voucher-board
          type="button"
          class="vb-btn icon"
          aria-label="다음 달"
          @click="shiftMonth(1)">
          ▶
        </button>
        <input
          data-ui-sales-voucher-board
          v-model="month.day"
          class="vb-num"
          maxlength="2"
          inputmode="numeric"
          placeholder="일자"
          aria-label="일자(선택)" />
        <i data-ui-sales-voucher-board>일</i>
      </template>
      <button data-ui-sales-voucher-board type="submit" class="vb-btn">조회</button>
      <span data-ui-sales-voucher-board class="vb-nav" role="group" aria-label="전기 차기">
        <button
          data-ui-sales-voucher-board
          type="button"
          :disabled="viewYear <= thisYear - 2"
          @click="shiftYear(-1)">
          ◀ 전기
        </button>
        <button
          data-ui-sales-voucher-board
          type="button"
          :disabled="viewYear >= thisYear"
          @click="shiftYear(1)">
          차기 ▶
        </button>
      </span>
      <span data-ui-sales-voucher-board v-if="navBadge" class="vb-nav-badge" :class="nav.dir">
        {{ navBadge }}
      </span>
      <button
        data-ui-sales-voucher-board
        type="button"
        class="vb-btn"
        aria-label="상세검색"
        @click="emit('search')">
        ▾
      </button>
      <span data-ui-sales-voucher-board class="vb-spacer" />
      <span data-ui-sales-voucher-board class="vb-pop-anchor">
        <button
          data-ui-sales-voucher-board
          type="button"
          class="vb-btn"
          @click="((sortChoice = order), (sortOpen = !sortOpen))">
          ↕ 데이터정렬
        </button>
        <div
          data-ui-sales-voucher-board
          v-if="sortOpen"
          class="vb-pop"
          role="dialog"
          aria-label="데이터정렬"
          @keydown.enter.prevent="applyOrder"
          @keydown.esc="sortOpen = false">
          <label data-ui-sales-voucher-board>
            <input data-ui-sales-voucher-board v-model="sortChoice" type="radio" value="input" />
            입력순
            <small data-ui-sales-voucher-board>등록된 원래 순서</small>
          </label>
          <label data-ui-sales-voucher-board>
            <input data-ui-sales-voucher-board v-model="sortChoice" type="radio" value="date" />
            날짜순
            <small data-ui-sales-voucher-board>오래된 날짜부터</small>
          </label>
          <div data-ui-sales-voucher-board class="vb-pop-actions">
            <button data-ui-sales-voucher-board type="button" class="vb-btn" @click="applyOrder">
              확인(Enter)
            </button>
          </div>
        </div>
      </span>
      <button data-ui-sales-voucher-board type="button" class="vb-btn" @click="openBulk">
        일괄변경
      </button>
      <details data-ui-sales-voucher-board class="vb-more">
        <summary data-ui-sales-voucher-board aria-label="더보기">⋯</summary>
        <div data-ui-sales-voucher-board class="vb-more-panel">
          <label data-ui-sales-voucher-board class="vb-sort">
            밀도
            <select data-ui-sales-voucher-board v-model="density" aria-label="테이블 밀도">
              <option data-ui-sales-voucher-board value="normal">기본</option>
              <option data-ui-sales-voucher-board value="compact">좁게</option>
            </select>
          </label>
          <slot name="more" />
        </div>
      </details>
    </form>
    <p data-ui-sales-voucher-board v-if="filterError" class="vb-error" role="alert">
      {{ filterError }}
    </p>

    <div data-ui-sales-voucher-board class="vb-tabs">
      <button
        data-ui-sales-voucher-board
        type="button"
        class="vb-all"
        :class="{ on: activeTab === 'all' }"
        @click="activeTab = 'all'">
        전체
      </button>
      <div data-ui-sales-voucher-board class="vb-tab-lines">
        <div
          data-ui-sales-voucher-board
          v-for="line in tabLines"
          :key="line.flow"
          class="vb-tab-line"
          :class="line.flow">
          <button
            data-ui-sales-voucher-board
            v-for="def in line.defs"
            :key="def.key"
            type="button"
            class="vb-tab"
            :class="{ on: activeTab === def.key, empty: def.empty }"
            :title="def.empty ? '아직 이 경로로 들어오는 자료가 없습니다' : undefined"
            @click="activeTab = def.key">
            {{ def.label }}
            <b data-ui-sales-voucher-board v-if="tabCount[def.key]">{{ tabCount[def.key] }}</b>
          </button>
          <button
            data-ui-sales-voucher-board
            type="button"
            class="vb-tab-toggle"
            :aria-expanded="tabsOpen"
            :title="tabsOpen ? '나머지 탭 접기' : '나머지 탭 펼치기'"
            @click="tabsOpen = !tabsOpen">
            {{ tabsOpen ? '▲ 접기' : '▼' }}
          </button>
        </div>
      </div>
    </div>

    <div data-ui-sales-voucher-board class="vb-main">
      <div data-ui-sales-voucher-board class="vb-left">
        <div data-ui-sales-voucher-board class="vb-grid-wrap">
          <table data-ui-sales-voucher-board class="vb-grid">
            <caption data-ui-sales-voucher-board class="sr-only">매입매출전표 목록</caption>
            <colgroup data-ui-sales-voucher-board>
              <col data-ui-sales-voucher-board class="column-width-30" />
              <col data-ui-sales-voucher-board class="column-width-44" />
              <col data-ui-sales-voucher-board class="column-width-28" />
              <col data-ui-sales-voucher-board class="column-width-28" />
              <col data-ui-sales-voucher-board class="column-width-104" />
              <col data-ui-sales-voucher-board />
              <col data-ui-sales-voucher-board class="column-width-44" />
              <col data-ui-sales-voucher-board class="column-width-80" />
              <col data-ui-sales-voucher-board class="column-width-92" />
              <col data-ui-sales-voucher-board class="column-width-84" />
              <col data-ui-sales-voucher-board class="column-width-96" />
              <col data-ui-sales-voucher-board class="column-width-64" />
              <col data-ui-sales-voucher-board class="column-width-112" />
              <col data-ui-sales-voucher-board class="column-width-100" />
              <col data-ui-sales-voucher-board class="column-width-62" />
              <col data-ui-sales-voucher-board class="column-width-62" />
            </colgroup>
            <thead data-ui-sales-voucher-board>
              <tr data-ui-sales-voucher-board>
                <th data-ui-sales-voucher-board>
                  <input
                    data-ui-sales-voucher-board
                    type="checkbox"
                    aria-label="전체 선택"
                    :checked="allChecked"
                    @change="toggleAll" />
                </th>
                <th data-ui-sales-voucher-board class="sortable" @click="toggleSort('date')">
                  년
                  <i data-ui-sales-voucher-board v-if="sort.key === 'date'">
                    {{ sort.dir === 1 ? '▲' : '▼' }}
                  </i>
                </th>
                <th data-ui-sales-voucher-board>월</th>
                <th data-ui-sales-voucher-board>일</th>
                <th
                  data-ui-sales-voucher-board
                  v-for="col in columns"
                  :key="col.key"
                  class="sortable"
                  @click="toggleSort(col.key)">
                  {{ col.label }}
                  <i data-ui-sales-voucher-board v-if="sort.key === col.key">
                    {{ sort.dir === 1 ? '▲' : '▼' }}
                  </i>
                </th>
              </tr>
            </thead>
            <tbody data-ui-sales-voucher-board>
              <tr
                data-ui-sales-voucher-board
                v-for="row in visibleRows"
                :key="row.id"
                :class="{ sel: isSelected(row) }"
                @click="pick(row)">
                <td data-ui-sales-voucher-board class="c" @click.stop>
                  <input
                    data-ui-sales-voucher-board
                    v-model="checked"
                    type="checkbox"
                    :value="row.id"
                    :aria-label="`${row.date} ${row.partner} 전표 선택`" />
                </td>
                <td
                  data-ui-sales-voucher-board
                  v-for="(part, index) in row.date.split('-')"
                  :key="index"
                  class="c num"
                  :class="dayKind(row.date)"
                  :title="dayTitle(row.date) || undefined">
                  {{ index ? datePart(part) : part }}
                </td>
                <td data-ui-sales-voucher-board class="c type">
                  <select
                    data-ui-sales-voucher-board
                    v-if="editable(row)"
                    v-model="session.draft.type"
                    aria-label="셀 유형"
                    @click.stop
                    @change="typeChanged">
                    <optgroup data-ui-sales-voucher-board label="매출">
                      <option
                        data-ui-sales-voucher-board
                        v-for="type in types.filter((item) => item.direction === 'sales')"
                        :key="type.code"
                        :value="type.code">
                        {{ label(type.code) }}
                      </option>
                    </optgroup>
                    <optgroup data-ui-sales-voucher-board label="매입">
                      <option
                        data-ui-sales-voucher-board
                        v-for="type in types.filter((item) => item.direction !== 'sales')"
                        :key="type.code"
                        :value="type.code">
                        {{ label(type.code) }}
                      </option>
                    </optgroup>
                  </select>
                  <span data-ui-sales-voucher-board v-else class="vb-type">
                    <span
                      data-ui-sales-voucher-board
                      class="vb-flow-badge"
                      :class="flowOf(shown(row).type)">
                      {{ flowOf(shown(row).type) === 'sale' ? '매출' : '매입' }}
                    </span>
                    <span
                      data-ui-sales-voucher-board
                      class="vb-code"
                      :class="flowOf(shown(row).type)">
                      {{ label(shown(row).type) }}
                    </span>
                  </span>
                </td>
                <td
                  data-ui-sales-voucher-board
                  class="ell"
                  :class="{ wrap: !editable(row) }"
                  :title="row.item">
                  <input
                    data-ui-sales-voucher-board
                    v-if="editable(row)"
                    v-model="session.draft.item"
                    class="vb-cell"
                    aria-label="셀 품목"
                    @click.stop
                    @input="journal.edit()" />
                  <template v-else>{{ row.item }}</template>
                </td>
                <td data-ui-sales-voucher-board class="r num">
                  {{ formatAmount(row.quantity ?? '1') }}
                </td>
                <td data-ui-sales-voucher-board class="r num">
                  {{ formatAmount(row.unitPrice ?? '0') }}
                </td>
                <!-- 전자(홈택스) 자료는 원본과 같아야 하므로 금액 입력칸을 만들지 않는다(설계 amountEditable) -->
                <td data-ui-sales-voucher-board class="r num">
                  <input
                    data-ui-sales-voucher-board
                    v-if="editable(row) && collectOf(shown(row)) !== 'e'"
                    class="vb-cell r num"
                    :value="formatAmount(session.draft.supply)"
                    aria-label="셀 공급가액"
                    @click.stop
                    @change="amountInput('supply', $event)" />
                  <template v-else>{{ formatAmount(shown(row).supply) }}</template>
                </td>
                <td
                  data-ui-sales-voucher-board
                  class="r num"
                  :class="{ zerovat: zeroVatWarning(shown(row), meta?.vatTypes) }"
                  :title="
                    zeroVatWarning(shown(row), meta?.vatTypes)
                      ? '과세 유형인데 세액이 0원입니다 — 확인요망'
                      : undefined
                  ">
                  <input
                    data-ui-sales-voucher-board
                    v-if="editable(row) && collectOf(shown(row)) !== 'e'"
                    class="vb-cell r num"
                    :value="formatAmount(session.draft.vat)"
                    aria-label="셀 세액"
                    @click.stop
                    @change="amountInput('vat', $event)" />
                  <template v-else>{{ formatAmount(shown(row).vat) }}</template>
                  <span
                    data-ui-sales-voucher-board
                    v-if="zeroVatWarning(shown(row), meta?.vatTypes)"
                    class="vb-review">
                    확인요망
                  </span>
                </td>
                <td data-ui-sales-voucher-board class="r num strong">
                  {{ formatAmount(sumAmounts([shown(row).supply, shown(row).vat])) }}
                </td>
                <td
                  data-ui-sales-voucher-board
                  class="c num dim"
                  :class="{ codecell: editable(row) }"
                  :tabindex="editable(row) ? 0 : undefined"
                  :title="editable(row) ? '클릭 · F2 → 거래처 도움' : undefined"
                  @click="editable(row) && (journal.searchOpen.value = true)"
                  @keydown.f2.prevent="editable(row) && (journal.searchOpen.value = true)">
                  {{ shown(row).partnerCode || '—' }}
                </td>
                <td data-ui-sales-voucher-board class="wrap">{{ shown(row).partner }}</td>
                <td data-ui-sales-voucher-board class="c num dim">{{ bizNo(shown(row)) }}</td>
                <td data-ui-sales-voucher-board class="c">
                  <span
                    data-ui-sales-voucher-board
                    class="vb-chip"
                    :class="'c-' + collectOf(shown(row))">
                    {{ COLLECT_LABEL[collectOf(shown(row))] }}
                  </span>
                </td>
                <td data-ui-sales-voucher-board class="c">
                  <input
                    data-ui-sales-voucher-board
                    v-if="editable(row)"
                    class="vb-cell c num"
                    maxlength="1"
                    inputmode="numeric"
                    :placeholder="BUNGE_NAME[session.draft.journalType ?? ''] ?? '#'"
                    aria-label="셀 분개 (1현금 2외상 3혼합 4카드 5분개없음 · F2 목록)"
                    @click.stop
                    @change="setRowBunge(($event.target as HTMLInputElement).value)"
                    @keydown.f2.prevent="bungeOpen = 'row'" />
                  <span
                    data-ui-sales-voucher-board
                    v-else
                    class="vb-bunge"
                    :class="'b-' + (shown(row).journalType ?? '')">
                    {{ BUNGE_NAME[shown(row).journalType ?? ''] ?? row.payment }}
                  </span>
                </td>
              </tr>
              <tr data-ui-sales-voucher-board v-if="!visibleRows.length && !loading">
                <td data-ui-sales-voucher-board colspan="16" class="vb-empty">
                  {{
                    TAB_DEFS.find((def) => def.key === activeTab)?.empty
                      ? '이 경로로 들어온 자료가 아직 없습니다'
                      : '표시할 전표가 없습니다'
                  }}
                </td>
              </tr>
              <!-- 상시 빈 입력행 — 어느 탭 · 조회조건이든 맨 아래 -->
              <tr data-ui-sales-voucher-board class="vb-draft">
                <td data-ui-sales-voucher-board class="c">＋</td>
                <td data-ui-sales-voucher-board class="c num dim">{{ draftYear }}</td>
                <td data-ui-sales-voucher-board>
                  <input
                    data-ui-sales-voucher-board
                    v-model="draft.month"
                    data-df="month"
                    class="vb-cell c num"
                    maxlength="2"
                    inputmode="numeric"
                    aria-label="입력 월"
                    @keydown="draftKey($event, 'month')" />
                </td>
                <td data-ui-sales-voucher-board>
                  <input
                    data-ui-sales-voucher-board
                    v-model="draft.day"
                    data-df="day"
                    class="vb-cell c num"
                    maxlength="2"
                    inputmode="numeric"
                    aria-label="입력 일"
                    @keydown="draftKey($event, 'day')" />
                </td>
                <td data-ui-sales-voucher-board>
                  <input
                    data-ui-sales-voucher-board
                    v-model="draft.type"
                    data-df="type"
                    class="vb-cell c num"
                    list="vb-type-codes"
                    maxlength="2"
                    placeholder="선택"
                    aria-label="입력 유형코드"
                    @keydown="draftKey($event, 'type')" />
                  <datalist data-ui-sales-voucher-board id="vb-type-codes">
                    <option
                      data-ui-sales-voucher-board
                      v-for="type in types"
                      :key="type.code"
                      :value="type.code">
                      {{ label(type.code) }}
                    </option>
                  </datalist>
                </td>
                <td data-ui-sales-voucher-board>
                  <input
                    data-ui-sales-voucher-board
                    v-model="draft.item"
                    data-df="item"
                    class="vb-cell"
                    placeholder="품목 입력 후 Enter"
                    aria-label="입력 품목"
                    @keydown="draftKey($event, 'item')" />
                </td>
                <td data-ui-sales-voucher-board>
                  <input
                    data-ui-sales-voucher-board
                    v-model="draft.qty"
                    data-df="qty"
                    class="vb-cell r num"
                    inputmode="decimal"
                    aria-label="입력 수량"
                    @keydown="draftKey($event, 'qty')" />
                </td>
                <td data-ui-sales-voucher-board>
                  <input
                    data-ui-sales-voucher-board
                    v-model="draft.unit"
                    data-df="unit"
                    class="vb-cell r num"
                    inputmode="decimal"
                    aria-label="입력 단가"
                    @keydown="draftKey($event, 'unit')" />
                </td>
                <td data-ui-sales-voucher-board>
                  <input
                    data-ui-sales-voucher-board
                    v-model="draft.supply"
                    data-df="supply"
                    class="vb-cell r num"
                    inputmode="numeric"
                    :placeholder="draftSupply && !draft.supply ? formatAmount(draftSupply) : ''"
                    aria-label="입력 공급가액"
                    @keydown="draftKey($event, 'supply')" />
                </td>
                <td data-ui-sales-voucher-board class="r num dim">
                  {{ draftVat ? formatAmount(draftVat) : '자동' }}
                </td>
                <td data-ui-sales-voucher-board class="r num dim">
                  {{
                    draftSupply && draftVat
                      ? formatAmount(sumAmounts([draftSupply, draftVat]))
                      : '자동'
                  }}
                </td>
                <td data-ui-sales-voucher-board>
                  <input
                    data-ui-sales-voucher-board
                    :value="draftPartner?.code ?? ''"
                    data-df="partner"
                    class="vb-cell c num"
                    readonly
                    placeholder="선택"
                    aria-label="입력 거래처코드 (F2 도움)"
                    @click="draftPartnerOpen = true"
                    @keydown="draftKey($event, 'partner')" />
                </td>
                <td data-ui-sales-voucher-board class="ell dim">{{ draftPartner?.name ?? '' }}</td>
                <td data-ui-sales-voucher-board class="c num dim">
                  {{ draftPartner?.businessNumber ?? '' }}
                </td>
                <td data-ui-sales-voucher-board class="c">
                  <span data-ui-sales-voucher-board class="vb-chip c-m">수기입력</span>
                </td>
                <td data-ui-sales-voucher-board>
                  <input
                    data-ui-sales-voucher-board
                    v-model="draft.bunge"
                    data-df="bunge"
                    class="vb-cell c num"
                    maxlength="1"
                    inputmode="numeric"
                    :placeholder="
                      draftType ? BUNGE_NAME[defaultJournalType(draftType.code)] : '선택'
                    "
                    aria-label="입력 분개 (1현금 2외상 3혼합 4카드 5분개없음 · F2 목록 · Enter 저장)"
                    @keydown="draftKey($event, 'bunge')" />
                </td>
              </tr>
            </tbody>
            <tfoot data-ui-sales-voucher-board>
              <tr data-ui-sales-voucher-board class="vb-sub">
                <td data-ui-sales-voucher-board colspan="8">
                  <b data-ui-sales-voucher-board>같은 거래처 합계</b>
                  <span data-ui-sales-voucher-board class="dim">
                    {{
                      selectedRow
                        ? `${selectedRow.partner} [ ${samePartnerRows.length} ]건`
                        : '행을 선택하세요'
                    }}
                  </span>
                </td>
                <td data-ui-sales-voucher-board class="r num">
                  {{ formatAmount(total(samePartnerRows).supply) }}
                </td>
                <td data-ui-sales-voucher-board class="r num">
                  {{ formatAmount(total(samePartnerRows).vat) }}
                </td>
                <td data-ui-sales-voucher-board class="r num">
                  {{ formatAmount(total(samePartnerRows).sum) }}
                </td>
                <td data-ui-sales-voucher-board colspan="5" />
              </tr>
              <tr data-ui-sales-voucher-board class="vb-sub">
                <td data-ui-sales-voucher-board colspan="8">
                  <b data-ui-sales-voucher-board class="gold">체크 선택합계</b>
                  <span data-ui-sales-voucher-board class="dim">
                    [ {{ checkedRows.length }} ]건
                  </span>
                </td>
                <td data-ui-sales-voucher-board class="r num">
                  {{ formatAmount(total(checkedRows).supply) }}
                </td>
                <td data-ui-sales-voucher-board class="r num">
                  {{ formatAmount(total(checkedRows).vat) }}
                </td>
                <td data-ui-sales-voucher-board class="r num">
                  {{ formatAmount(total(checkedRows).sum) }}
                </td>
                <td data-ui-sales-voucher-board colspan="5" />
              </tr>
              <tr data-ui-sales-voucher-board>
                <td data-ui-sales-voucher-board colspan="8">
                  <b data-ui-sales-voucher-board>합계</b>
                  <span data-ui-sales-voucher-board class="dim">
                    [ {{ visibleRows.length }} ]건
                  </span>
                </td>
                <td data-ui-sales-voucher-board class="r num">
                  {{ formatAmount(total(visibleRows).supply) }}
                </td>
                <td data-ui-sales-voucher-board class="r num">
                  {{ formatAmount(total(visibleRows).vat) }}
                </td>
                <td data-ui-sales-voucher-board class="r num">
                  {{ formatAmount(total(visibleRows).sum) }}
                </td>
                <td data-ui-sales-voucher-board colspan="5" />
              </tr>
            </tfoot>
          </table>
        </div>
        <p data-ui-sales-voucher-board v-if="draftError || rowError" class="vb-error" role="alert">
          {{ draftError || rowError }}
        </p>

        <section data-ui-sales-voucher-board class="vb-lines" aria-label="분개">
          <table data-ui-sales-voucher-board class="vb-grid">
            <thead data-ui-sales-voucher-board>
              <tr data-ui-sales-voucher-board>
                <th data-ui-sales-voucher-board>구분</th>
                <th data-ui-sales-voucher-board>계정코드</th>
                <th data-ui-sales-voucher-board>계정과목</th>
                <th data-ui-sales-voucher-board>차변(출금)</th>
                <th data-ui-sales-voucher-board>대변(입금)</th>
                <th data-ui-sales-voucher-board>거래처코드</th>
                <th data-ui-sales-voucher-board>거래처</th>
                <th data-ui-sales-voucher-board>적요코드</th>
                <th data-ui-sales-voucher-board>적요</th>
              </tr>
            </thead>
            <tbody data-ui-sales-voucher-board>
              <tr data-ui-sales-voucher-board v-for="(line, index) in lineRows" :key="index">
                <td data-ui-sales-voucher-board class="c">
                  {{ line.side === 'debit' ? '차변' : '대변' }}
                </td>
                <td data-ui-sales-voucher-board class="c num">
                  {{ account(line.account)?.code ?? '' }}
                </td>
                <td data-ui-sales-voucher-board :class="{ warn: !account(line.account) }">
                  {{ account(line.account)?.name ?? '(계정과목 미지정)' }}
                </td>
                <td data-ui-sales-voucher-board class="r num">
                  {{ line.side === 'debit' ? formatAmount(line.amount) : '' }}
                </td>
                <td data-ui-sales-voucher-board class="r num">
                  {{ line.side === 'credit' ? formatAmount(line.amount) : '' }}
                </td>
                <td data-ui-sales-voucher-board class="c num dim">
                  {{ isCounterpart(line.side) ? sideInfo?.code : '' }}
                </td>
                <td data-ui-sales-voucher-board>
                  {{ isCounterpart(line.side) ? sideInfo?.name : '' }}
                </td>
                <td data-ui-sales-voucher-board class="c num dim">
                  {{
                    meta?.summaries?.find(
                      (summary) => summary.accountId === line.account && summary.text === line.memo,
                    )?.id ?? ''
                  }}
                </td>
                <td data-ui-sales-voucher-board class="ell dim">{{ line.memo }}</td>
              </tr>
              <tr data-ui-sales-voucher-board v-if="!lineRows.length">
                <td data-ui-sales-voucher-board colspan="9" class="vb-empty small">
                  {{
                    session.selected
                      ? '분개가 없습니다 (분개없음 또는 미입력)'
                      : '위에서 행을 선택하면 분개가 표시됩니다'
                  }}
                </td>
              </tr>
            </tbody>
            <tfoot data-ui-sales-voucher-board>
              <tr data-ui-sales-voucher-board>
                <td data-ui-sales-voucher-board colspan="3">
                  <b data-ui-sales-voucher-board>합계</b>
                </td>
                <td data-ui-sales-voucher-board class="r num">
                  {{ lineRows.length ? formatAmount(lineTotals.debit) : '' }}
                </td>
                <td data-ui-sales-voucher-board class="r num">
                  {{ lineRows.length ? formatAmount(lineTotals.credit) : '' }}
                </td>
                <td
                  data-ui-sales-voucher-board
                  colspan="4"
                  :class="{ warn: lineTotals.debit !== lineTotals.credit }">
                  {{ lineTotals.debit === lineTotals.credit ? '' : '대차 불일치' }}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>
      </div>

      <aside data-ui-sales-voucher-board class="vb-side" aria-label="전표 상세">
        <section data-ui-sales-voucher-board class="vb-panel">
          <button
            data-ui-sales-voucher-board
            type="button"
            class="vb-panel-head"
            :aria-expanded="panels.meta"
            @click="panels.meta = !panels.meta">
            🧾 전표정보
            <span data-ui-sales-voucher-board>▾</span>
          </button>
          <div data-ui-sales-voucher-board v-show="panels.meta" class="vb-panel-body">
            <dl data-ui-sales-voucher-board v-if="sideInfo">
              <dt data-ui-sales-voucher-board>전표번호</dt>
              <dd data-ui-sales-voucher-board>{{ sideInfo.entry }}</dd>
              <dt data-ui-sales-voucher-board>출처</dt>
              <dd data-ui-sales-voucher-board>{{ sideInfo.source }}</dd>
              <dt data-ui-sales-voucher-board>자료수집</dt>
              <dd data-ui-sales-voucher-board>{{ sideInfo.collect }}</dd>
              <dt data-ui-sales-voucher-board>상태</dt>
              <dd data-ui-sales-voucher-board>
                {{ sideInfo.status }}
                <span data-ui-sales-voucher-board v-if="sideInfo.review" class="vb-review inline">
                  확인요망
                </span>
              </dd>
            </dl>
            <p data-ui-sales-voucher-board v-else class="dim">행을 선택하면 표시됩니다</p>
          </div>
        </section>
        <section data-ui-sales-voucher-board class="vb-panel">
          <button
            data-ui-sales-voucher-board
            type="button"
            class="vb-panel-head"
            :aria-expanded="panels.partner"
            @click="panels.partner = !panels.partner">
            🏢 거래처정보
            <span data-ui-sales-voucher-board>▾</span>
          </button>
          <div data-ui-sales-voucher-board v-show="panels.partner" class="vb-panel-body">
            <dl data-ui-sales-voucher-board v-if="sideInfo">
              <dt data-ui-sales-voucher-board>거래처코드</dt>
              <dd data-ui-sales-voucher-board>{{ sideInfo.code || '—' }}</dd>
              <dt data-ui-sales-voucher-board>거래처명</dt>
              <dd data-ui-sales-voucher-board>{{ sideInfo.name || '—' }}</dd>
              <dt data-ui-sales-voucher-board>사업자번호</dt>
              <dd data-ui-sales-voucher-board>{{ sideInfo.bizNo || '—' }}</dd>
            </dl>
            <p data-ui-sales-voucher-board v-else class="dim">행을 선택하면 표시됩니다</p>
          </div>
        </section>
        <section data-ui-sales-voucher-board class="vb-panel">
          <button
            data-ui-sales-voucher-board
            type="button"
            class="vb-panel-head"
            :aria-expanded="panels.reason"
            @click="panels.reason = !panels.reason">
            🚫 불공사유
            <span data-ui-sales-voucher-board>▾</span>
          </button>
          <div data-ui-sales-voucher-board v-show="panels.reason" class="vb-panel-body">
            <label data-ui-sales-voucher-board class="vb-field">
              불공사유 선택
              <small data-ui-sales-voucher-board>F2 도움</small>
              <input
                data-ui-sales-voucher-board
                class="vb-cell"
                :value="session.selected ? (session.draft.nonDeductionReason ?? '') : ''"
                :disabled="!session.selected || locked"
                placeholder="F2로 팝업 선택 또는 직접입력"
                aria-label="불공사유 (F2 도움)"
                @input="
                  ((session.draft.nonDeductionReason = ($event.target as HTMLInputElement).value),
                  journal.edit())
                "
                @keydown.f2.prevent="openReason('row')" />
            </label>
          </div>
        </section>
        <section data-ui-sales-voucher-board class="vb-panel">
          <button
            data-ui-sales-voucher-board
            type="button"
            class="vb-panel-head"
            :aria-expanded="panels.history"
            @click="panels.history = !panels.history">
            🕓 상태이력
            <span data-ui-sales-voucher-board>▾</span>
          </button>
          <div data-ui-sales-voucher-board v-show="panels.history" class="vb-panel-body">
            <ul data-ui-sales-voucher-board v-if="sideInfo" class="vb-history">
              <li data-ui-sales-voucher-board>
                <time data-ui-sales-voucher-board>{{ selectedRow?.date }}</time>
                {{
                  collectOf(selectedRow!) === 'e'
                    ? '홈택스 자동수집으로 등록'
                    : collectOf(selectedRow!) === 'n'
                      ? '비전자증빙 등록'
                      : '수기입력으로 등록'
                }}
              </li>
              <li data-ui-sales-voucher-board v-for="(item, index) in history" :key="index">
                <time data-ui-sales-voucher-board>
                  {{ item.createdAt.slice(0, 16).replace('T', ' ') }}
                </time>
                {{ ACTION_LABEL[item.action] ?? item.action }} · {{ item.actor }}
              </li>
            </ul>
            <p data-ui-sales-voucher-board v-else class="dim">행을 선택하면 표시됩니다</p>
            <p data-ui-sales-voucher-board v-if="historyError" class="vb-error">
              {{ historyError }}
            </p>
          </div>
        </section>
      </aside>
    </div>

    <SearchDialog
      data-ui-sales-voucher-board
      :open="draftPartnerOpen"
      :items="journal.partners.value"
      @close="draftPartnerOpen = false"
      @select="pickDraftPartner" />

    <UiModal :open="!!bungeOpen" title="분개 선택" size="confirm" @close="bungeOpen = ''">
      <div data-ui-sales-voucher-board class="vb-choice">
        <button
          data-ui-sales-voucher-board
          v-for="no in ['1', '2', '3', '4', '5']"
          :key="no"
          type="button"
          class="vb-btn"
          @click="pickBunge(no)">
          {{ BUNGE_LABEL[SCREEN_TO_JOURNAL[no] ?? ''] }}
        </button>
      </div>
    </UiModal>

    <UiModal :open="!!reasonTarget" title="불공제사유선택" @close="reasonTarget = ''">
      <div data-ui-sales-voucher-board class="vb-reasons" @keydown.enter.prevent="confirmReason">
        <label data-ui-sales-voucher-board v-for="reason in NONDEDUCT_REASONS" :key="reason.code">
          <input
            data-ui-sales-voucher-board
            v-model="reasonPick"
            type="radio"
            :value="reason.code" />
          <b data-ui-sales-voucher-board>{{ reason.code }}</b>
          {{ reason.name }}
        </label>
      </div>
      <template #footer>
        <UiButton data-ui-sales-voucher-board :disabled="!reasonPick" @click="confirmReason">
          확인
        </UiButton>
        <UiButton data-ui-sales-voucher-board @click="reasonTarget = ''">닫기(esc)</UiButton>
      </template>
    </UiModal>

    <UiModal
      :open="bulkOpen"
      title="일괄변경"
      size="large"
      @close="!bulkBusy && (bulkOpen = false)">
      <p data-ui-sales-voucher-board class="dim">
        대상 {{ bulkTargets.length }}건 (체크한 전표, 없으면 선택한 전표) · 왼쪽 체크박스를 켠
        항목만 변경합니다.
      </p>
      <div data-ui-sales-voucher-board class="vb-bulk">
        <fieldset data-ui-sales-voucher-board :class="{ off: !bulk.s1 }">
          <legend data-ui-sales-voucher-board>
            <label data-ui-sales-voucher-board>
              <input data-ui-sales-voucher-board v-model="bulk.s1" type="checkbox" />
              1. 계정과목 및 적요/품목
            </label>
          </legend>
          <div data-ui-sales-voucher-board class="vb-bulk-grid" :inert="!bulk.s1">
            <label data-ui-sales-voucher-board>
              차변
              <select data-ui-sales-voucher-board v-model="bulk.debit">
                <option data-ui-sales-voucher-board value="">변경 안 함</option>
                <option
                  data-ui-sales-voucher-board
                  v-for="item in meta?.accounts"
                  :key="item.id"
                  :value="item.id">
                  {{ item.code }} {{ item.name }}
                </option>
              </select>
            </label>
            <label data-ui-sales-voucher-board>
              대변
              <select data-ui-sales-voucher-board v-model="bulk.credit">
                <option data-ui-sales-voucher-board value="">변경 안 함</option>
                <option
                  data-ui-sales-voucher-board
                  v-for="item in meta?.accounts"
                  :key="item.id"
                  :value="item.id">
                  {{ item.code }} {{ item.name }}
                </option>
              </select>
            </label>
            <label data-ui-sales-voucher-board>
              품목
              <select data-ui-sales-voucher-board v-model="bulk.itemMode">
                <option data-ui-sales-voucher-board value="0">0.없음</option>
                <option data-ui-sales-voucher-board value="1">1.품목지정</option>
              </select>
              <input
                data-ui-sales-voucher-board
                v-model="bulk.item"
                :disabled="bulk.itemMode !== '1'"
                maxlength="200"
                aria-label="일괄 품목" />
            </label>
            <label data-ui-sales-voucher-board>
              적요
              <select data-ui-sales-voucher-board v-model="bulk.memoMode">
                <option data-ui-sales-voucher-board value="0">0.없음</option>
                <option data-ui-sales-voucher-board value="1">1.적요지정</option>
              </select>
              <input
                data-ui-sales-voucher-board
                v-model="bulk.memo"
                :disabled="bulk.memoMode !== '1'"
                maxlength="500"
                aria-label="일괄 적요" />
            </label>
          </div>
          <small data-ui-sales-voucher-board>
            ※ 차변계정은 재고자산(0146~0175), 제조원가 ~ 판매/관리비(0501~0900) 계정만 사용
            가능합니다.
          </small>
        </fieldset>
        <fieldset data-ui-sales-voucher-board :class="{ off: !bulk.s2 }">
          <legend data-ui-sales-voucher-board>
            <label data-ui-sales-voucher-board>
              <input data-ui-sales-voucher-board v-model="bulk.s2" type="checkbox" />
              2. 공제여부 일괄변경
            </label>
          </legend>
          <div data-ui-sales-voucher-board :inert="!bulk.s2" class="vb-radios">
            <label data-ui-sales-voucher-board>
              <input data-ui-sales-voucher-board v-model="bulk.deduct" type="radio" value="1" />
              1.불공제
            </label>
            <label data-ui-sales-voucher-board>
              <input data-ui-sales-voucher-board v-model="bulk.deduct" type="radio" value="2" />
              2.공제
            </label>
          </div>
          <small data-ui-sales-voucher-board>
            ※ 불공제 → 일반전표로 이동, 공제 → 57.카과 · 58.카면 · 59.카영 유형으로 자동 반영됩니다.
          </small>
        </fieldset>
        <fieldset data-ui-sales-voucher-board :class="{ off: !bulk.s3 }">
          <legend data-ui-sales-voucher-board>
            <label data-ui-sales-voucher-board>
              <input data-ui-sales-voucher-board v-model="bulk.s3" type="checkbox" />
              3. 유형 일괄변경
            </label>
          </legend>
          <div data-ui-sales-voucher-board :inert="!bulk.s3" class="vb-radios">
            <label
              data-ui-sales-voucher-board
              v-for="item in ['57.카과', '58.카면', '58.카면(의제)', '59.카영', '공통매입세액안분']"
              :key="item">
              <input data-ui-sales-voucher-board v-model="bulk.type" type="radio" :value="item" />
              {{ item }}
            </label>
          </div>
          <small data-ui-sales-voucher-board>
            ※ 유형변경은 공제 수정이 「공제」인 경우만 가능합니다.
          </small>
        </fieldset>
        <fieldset data-ui-sales-voucher-board :class="{ off: !bulk.s4 }">
          <legend data-ui-sales-voucher-board>
            <label data-ui-sales-voucher-board>
              <input data-ui-sales-voucher-board v-model="bulk.s4" type="checkbox" />
              4. 분개 일괄변경
            </label>
          </legend>
          <div data-ui-sales-voucher-board :inert="!bulk.s4" class="vb-radios">
            <label
              data-ui-sales-voucher-board
              v-for="item in [
                ['0', '0.분개없음'],
                ['1', '1.현금'],
                ['4', '4.카드'],
              ]"
              :key="item[0]">
              <input
                data-ui-sales-voucher-board
                v-model="bulk.journal"
                type="radio"
                :value="item[0]" />
              {{ item[1] }}
            </label>
          </div>
        </fieldset>
        <fieldset data-ui-sales-voucher-board :class="{ off: !bulk.s5 }">
          <legend data-ui-sales-voucher-board>
            <label data-ui-sales-voucher-board>
              <input data-ui-sales-voucher-board v-model="bulk.s5" type="checkbox" />
              5. 거래처 일괄변경
            </label>
          </legend>
          <div data-ui-sales-voucher-board class="vb-bulk-grid" :inert="!bulk.s5">
            <label data-ui-sales-voucher-board>
              차변
              <select data-ui-sales-voucher-board v-model="bulk.debitPartner">
                <option data-ui-sales-voucher-board value="">선택</option>
                <option
                  data-ui-sales-voucher-board
                  v-for="item in meta?.partners"
                  :key="item.id"
                  :value="item.id">
                  {{ item.code }} {{ item.name }}
                </option>
              </select>
            </label>
            <label data-ui-sales-voucher-board>
              대변
              <select data-ui-sales-voucher-board v-model="bulk.creditPartner">
                <option data-ui-sales-voucher-board value="">선택</option>
                <option
                  data-ui-sales-voucher-board
                  v-for="item in meta?.partners"
                  :key="item.id"
                  :value="item.id">
                  {{ item.code }} {{ item.name }}
                </option>
              </select>
            </label>
          </div>
        </fieldset>
      </div>
      <p data-ui-sales-voucher-board v-if="bulkMessage" class="vb-error" role="alert">
        {{ bulkMessage }}
      </p>
      <template #footer>
        <UiButton
          data-ui-sales-voucher-board
          variant="primary"
          :disabled="bulkBusy"
          @click="applyBulk">
          {{ bulkBusy ? '적용 중…' : '확인' }}
        </UiButton>
        <UiButton data-ui-sales-voucher-board :disabled="bulkBusy" @click="bulkOpen = false">
          닫기(esc)
        </UiButton>
      </template>
    </UiModal>
  </section>
</template>
