<script setup lang="ts">
// 홈택스 자료수집 — 이지북스 「홈택스 자료수집」 모달과 같은 배치 · 같은 항목.
// 왼쪽: 대상 사업체(검색 · 전체 선택 · 현재 · 계정 미등록). 오른쪽: 인증 방식(저장된 계정) · 수집 항목(묶음별 체크).
// 매입매출은 이지북스처럼 한 줄이다 — 고르면 8종(세금계산서 · 계산서 · 현금영수증 · 카드 매출/매입)을 모두 받는다.
// 수출실적명세서 · 화물운전자복지카드 · 신고서는 팀장님 스크랩 API 에 아직 없어 「준비 중」으로 보이기만 한다.
import { bundleNotice, collectedNotice, filterCompanies, hometaxMaintenance, salesPurchasePeriod } from '../logic'
import { COLLECTION_KINDS, LOGIN_TYPE_LABEL, type CollectionCompany, type LoginType, type SaveAccountInput, type StartRunInput } from '../types'

const props = defineProps<{
  open: boolean
  companies: CollectionCompany[]
  initialClients: string[]
  starting: boolean
  error: string
  /** 업체 홈택스 계정 저장 — 부모가 서비스로 보낸다 */
  saveAccount?: (clientId: string, input: SaveAccountInput) => Promise<void>
}>()
const emit = defineEmits<{ close: [], start: [input: StartRunInput] }>()

const PS_KINDS = COLLECTION_KINDS.filter(kind => kind.flow !== 'info').map(kind => kind.type)

interface Item { key: string, label: string, period: string, kinds: string[], ready: boolean }
interface Group { key: string, label: string, items: Item[] }

const today = ref(new Date())
const psPeriod = computed(() => salesPurchasePeriod(today.value))
const year = computed(() => today.value.getFullYear())
const groups = computed<Group[]>(() => {
  const range = `${psPeriod.value.from} ~ ${psPeriod.value.to}`
  const years = `${year.value - 3}년 ~ ${year.value}년`
  const soon = (key: string, label: string, period: string): Item => ({ key, label, period, kinds: [], ready: false })
  return [
    { key: 'info', label: '기본정보', items: [{ key: 'bizinfo', label: '사업체 기본정보 (등록증명)', period: '현재일자 기준', kinds: ['bizinfo'], ready: true }] },
    { key: 'collect', label: '자료수집', items: [
      { key: 'ps', label: '매입매출 (세금계산서·현금영수증·카드)', period: range, kinds: PS_KINDS, ready: true },
      soon('export', '수출실적명세서', range + ' (반기별 6회)'),
      soon('cargo', '화물운전자복지카드 매입', range + ' (연도별 3회)'),
    ] },
    { key: 'report', label: '신고서', items: [
      soon('vat', '부가가치세 신고서', years),
      soon('income', '종합소득세 신고서', years),
      soon('withhold', '원천세 신고서', '현재일자 기준'),
      soon('vatReceipt', '부가가치세 접수증·납부서', years),
      soon('incomeReceipt', '종합소득세 접수증·납부서', years),
      soon('withholdReceipt', '원천세 접수증·납부서', '현재일자 기준'),
      soon('local', '지방소득세 특별징수 신고서·납부서', '현재일자 기준'),
    ] },
  ]
})
const readyItems = computed(() => groups.value.flatMap(group => group.items.filter(item => item.ready)))

const clientIds = ref<string[]>([])
const items = ref<string[]>([])
const full = ref(false)
const loginType = ref<LoginType>('idpw')
const search = ref('')
watch(() => props.open, (open) => {
  if (!open) { return }
  today.value = new Date()
  full.value = false
  loginType.value = 'idpw'
  search.value = ''
  items.value = []
  clientIds.value = [...props.initialClients]
}, { immediate: true })

const toggle = (list: string[], value: string, on: boolean) => on ? [...new Set([...list, value])] : list.filter(item => item !== value)

/* 대상 사업체 — 행에서 연 사업체는 「현재」 */
const current = computed(() => props.initialClients.length === 1 ? props.initialClients[0] : '')
const listed = computed(() => filterCompanies(props.companies, search.value, ''))
const listedChecked = computed(() => listed.value.filter(row => clientIds.value.includes(row.clientId)).length)
function toggleListed(on: boolean) {
  const ids = listed.value.map(row => row.clientId)
  clientIds.value = on ? [...new Set([...clientIds.value, ...ids])] : clientIds.value.filter(id => !ids.includes(id))
}
const picked = computed(() => props.companies.filter(row => clientIds.value.includes(row.clientId)))
const single = computed(() => picked.value.length === 1 ? picked.value[0]! : null)
const missing = computed(() => picked.value.filter(row => !row.hometaxReady))

/* 저장된 계정 — 한 곳만 고르면 아이디 · 비밀번호를 넣고 저장할 수 있다(이지북스와 같은 자리) */
const account = reactive({ hometaxId: '', password: '', juminFront6: '', juminLast1: '' })
const accountSaving = ref(false)
const accountMessage = ref('')
const accountError = ref('')
watch(() => single.value?.clientId, () => {
  Object.assign(account, { hometaxId: single.value?.hometaxId ?? '', password: '', juminFront6: '', juminLast1: '' })
  accountMessage.value = ''
  accountError.value = ''
}, { immediate: true })
const accountDirty = computed(() => !!single.value && (account.hometaxId.trim() !== (single.value.hometaxId ?? '') || !!account.password || !!account.juminFront6 || !!account.juminLast1))
async function storeAccount() {
  if (!single.value || !props.saveAccount) { return }
  accountSaving.value = true
  accountError.value = ''
  accountMessage.value = ''
  try {
    await props.saveAccount(single.value.clientId, {
      hometaxId: account.hometaxId.trim(),
      ...(account.password ? { password: account.password } : {}),
      ...(account.juminFront6 ? { juminFront6: account.juminFront6 } : {}),
      ...(account.juminLast1 ? { juminLast1: account.juminLast1 } : {}),
    })
    account.password = ''
    account.juminFront6 = ''
    account.juminLast1 = ''
    accountMessage.value = '저장했습니다.'
  }
  catch (error) {
    accountError.value = (error as { data?: { error?: { message?: string } } }).data?.error?.message ?? (error as Error).message
  }
  finally {
    accountSaving.value = false
  }
}

/* 수집 항목 — 받을 수 있는 항목만 체크된다 */
const groupState = (group: Group) => {
  const ready = group.items.filter(item => item.ready).map(item => item.key)
  const on = ready.filter(key => items.value.includes(key)).length
  return { all: ready.length > 0 && on === ready.length, some: on > 0 && on < ready.length, disabled: !ready.length }
}
function toggleGroup(group: Group, on: boolean) {
  const ready = group.items.filter(item => item.ready).map(item => item.key)
  items.value = on ? [...new Set([...items.value, ...ready])] : items.value.filter(key => !ready.includes(key))
}
const allOn = computed(() => readyItems.value.every(item => items.value.includes(item.key)))
const kinds = computed(() => readyItems.value.filter(item => items.value.includes(item.key)).flatMap(item => item.kinds))
const notice = (item: Item) => item.kinds.length === 1 ? collectedNotice(picked.value, item.kinds[0]!) : item.kinds.length ? bundleNotice(picked.value, item.kinds) : ''

const needsLogin = computed(() => kinds.value.some(type => type !== 'bizinfo'))
const maintenance = computed(() => props.open && needsLogin.value && hometaxMaintenance(new Date()))
const invalid = computed(() => !picked.value.length || !kinds.value.length)

function submit() {
  if (invalid.value) { return }
  emit('start', { clientIds: picked.value.map(row => row.clientId), kinds: [...kinds.value], ...psPeriod.value, full: full.value })
}
</script>

<template>
  <UiModal
    :open="open"
    title="홈택스 자료수집"
    size="large"
    @close="emit('close')"
  >
    <form
      class="run-form run-form-wide"
      @submit.prevent="submit"
    >
      <!-- 대상 사업체 -->
      <aside class="run-targets">
        <div class="run-targets-head">
          <h3>대상 사업체</h3>
          <span>{{ picked.length }}개 선택</span>
        </div>
        <div class="search-input">
          <UiIcon
            name="search"
            :size="16"
          />
          <UiInput
            v-model="search"
            aria-label="대상 사업체 검색"
            placeholder="상호·대표자·사업자번호 검색"
          />
        </div>
        <div class="run-target-list">
          <label class="run-target all">
            <input
              type="checkbox"
              :checked="listed.length > 0 && listedChecked === listed.length"
              :indeterminate="listedChecked > 0 && listedChecked < listed.length"
              aria-label="대상 사업체 모두 선택"
              @change="toggleListed(($event.target as HTMLInputElement).checked)"
            >
            <b>상호</b>
          </label>
          <div class="run-target-scroll">
            <label
              v-for="row in listed"
              :key="row.clientId"
              class="run-target"
              :class="{ on: clientIds.includes(row.clientId) }"
            >
              <input
                type="checkbox"
                :checked="clientIds.includes(row.clientId)"
                @change="clientIds = toggle(clientIds, row.clientId, ($event.target as HTMLInputElement).checked)"
              >
              <span>{{ row.name }}</span>
              <i v-if="row.clientId === current">현재</i>
              <em v-if="!row.hometaxReady">계정 미등록</em>
            </label>
            <p
              v-if="!listed.length"
              class="run-help"
            >
              검색 결과가 없습니다.
            </p>
          </div>
        </div>
      </aside>

      <div class="run-main">
        <!-- 인증 방식 -->
        <section class="run-auth">
          <div class="run-auth-head">
            <h3>인증 방식</h3>
            <div
              class="run-auth-tabs"
              role="tablist"
              aria-label="인증 방식"
            >
              <button
                v-for="type in (['idpw', 'cert'] as LoginType[])"
                :key="type"
                type="button"
                role="tab"
                :aria-selected="loginType === type"
                :class="{ active: loginType === type }"
                :disabled="type === 'cert'"
                :title="type === 'cert' ? '스크랩 서버에 아직 없는 방식입니다 (준비 중)' : ''"
                @click="loginType = type"
              >
                {{ LOGIN_TYPE_LABEL[type] }}
              </button>
            </div>
          </div>
          <template v-if="single">
            <p class="run-auth-saved">
              저장된 계정
              <UiBadge :tone="single.hometaxReady ? 'success' : 'danger'">
                {{ single.hometaxReady ? '등록됨' : '미등록' }}
              </UiBadge>
            </p>
            <div class="run-auth-fields">
              <label>
                <span>홈택스 아이디</span>
                <input
                  v-model="account.hometaxId"
                  maxlength="50"
                  autocomplete="off"
                  placeholder="홈택스 아이디"
                >
              </label>
              <label>
                <span>홈택스 비밀번호</span>
                <input
                  v-model="account.password"
                  type="password"
                  maxlength="100"
                  autocomplete="new-password"
                  :placeholder="single.hometaxReady ? '········ (바꿀 때만 입력)' : '홈택스 비밀번호'"
                >
              </label>
              <label>
                <span>주민번호 앞 6자리 <small>계정에 따라</small></span>
                <input
                  v-model="account.juminFront6"
                  inputmode="numeric"
                  maxlength="6"
                  autocomplete="off"
                  placeholder="2차 인증이 필요한 계정만"
                >
              </label>
              <label>
                <span>주민번호 뒤 1자리 <small>계정에 따라</small></span>
                <input
                  v-model="account.juminLast1"
                  inputmode="numeric"
                  maxlength="1"
                  autocomplete="off"
                  placeholder="예: 1"
                >
              </label>
            </div>
            <div class="run-auth-save">
              <span
                v-if="accountError"
                class="collection-invalid"
                role="alert"
              >{{ accountError }}</span>
              <span
                v-else-if="accountMessage"
                class="run-auth-ok"
                role="status"
              >{{ accountMessage }}</span>
              <span
                v-else
                class="run-help"
              >비밀번호는 서버에만 암호화해 두고 화면에는 다시 보이지 않습니다.</span>
              <UiButton
                size="small"
                variant="outline"
                :disabled="!accountDirty || !account.hometaxId.trim() || !saveAccount"
                :loading="accountSaving"
                @click="storeAccount"
              >
                계정 저장
              </UiButton>
            </div>
          </template>
          <p
            v-else
            class="run-help"
          >
            각 사업체에 저장된 홈택스 계정으로 순차 로그인합니다.
          </p>
        </section>

        <!-- 수집 항목 -->
        <section>
          <div class="run-section-head">
            <h3>수집 항목</h3>
            <label class="run-full">
              <input
                v-model="full"
                type="checkbox"
              >
              기간 전체 재수집
            </label>
          </div>
          <div class="run-kind-scroll">
            <table class="run-kind-table">
              <thead>
                <tr>
                  <th class="check">
                    <input
                      type="checkbox"
                      :checked="allOn"
                      :indeterminate="items.length > 0 && !allOn"
                      aria-label="수집 항목 모두 선택"
                      @change="items = ($event.target as HTMLInputElement).checked ? readyItems.map(item => item.key) : []"
                    >
                  </th>
                  <th>수집 항목</th>
                  <th>조회 기간</th>
                  <th>기수집 안내</th>
                </tr>
              </thead>
              <tbody
                v-for="group in groups"
                :key="group.key"
              >
                <tr class="group">
                  <td class="check">
                    <input
                      type="checkbox"
                      :checked="groupState(group).all"
                      :indeterminate="groupState(group).some"
                      :disabled="groupState(group).disabled"
                      :aria-label="group.label + ' 모두 선택'"
                      @change="toggleGroup(group, ($event.target as HTMLInputElement).checked)"
                    >
                  </td>
                  <td colspan="3">
                    {{ group.label }}
                  </td>
                </tr>
                <tr
                  v-for="item in group.items"
                  :key="item.key"
                  :class="{ soon: !item.ready }"
                >
                  <td class="check">
                    <input
                      type="checkbox"
                      :checked="items.includes(item.key)"
                      :disabled="!item.ready"
                      :aria-label="item.label"
                      @change="items = toggle(items, item.key, ($event.target as HTMLInputElement).checked)"
                    >
                  </td>
                  <td>
                    {{ item.label }}
                    <small
                      v-if="!item.ready"
                      title="팀장님 스크랩 API 에 아직 없는 자료입니다"
                    >준비 중</small>
                  </td>
                  <td class="muted">
                    {{ item.period }}
                  </td>
                  <td class="muted">
                    {{ notice(item) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="run-help">
            매입매출은 세금계산서 · 계산서 · 현금영수증 · 신용카드 매출/매입을 한 번에 받습니다(신용카드 매출은 분기별 월합계, 판매대행 포함).
            「기간 전체 재수집」을 끄면 종류마다 이미 받은 마지막 날 이후만 받습니다.
          </p>
        </section>

        <p
          v-if="maintenance"
          class="run-warning"
          role="note"
        >
          지금은 홈택스 점검시간(한국시간 00~06시)이라 홈택스 자료는 실패합니다. 06시 이후에 시작해 주세요.
        </p>
        <p
          v-if="missing.length && needsLogin"
          class="run-warning"
          role="note"
        >
          <b>{{ missing.map(row => row.name).join(', ') }}</b>은(는) 홈택스 계정이 등록되어 있지 않아 기본정보 말고는 실패합니다.
        </p>
        <p class="run-help">
          홈택스는 비밀번호를 5회 틀리면 계정을 잠그므로 인증 오류는 자동으로 다시 시도하지 않습니다. 한 사업체는 한 번에 한 작업만 돕니다.
        </p>
        <p
          v-if="error"
          class="collection-alert"
          role="alert"
        >
          {{ error }}
        </p>
      </div>
    </form>
    <template #footer>
      <UiButton
        variant="outline"
        class="run-close"
        @click="emit('close')"
      >
        닫기
      </UiButton>
      <UiButton
        variant="danger"
        :disabled="invalid"
        :loading="starting"
        @click="submit"
      >
        수집 시작
      </UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.run-form-wide { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: var(--aat-space-5); align-items: start; }
.run-form-wide input[type=checkbox] { accent-color: var(--aat-color-danger); width: 16px; height: 16px; }
.run-targets { display: flex; flex-direction: column; gap: var(--aat-space-2); position: sticky; top: 0; }
.run-targets-head { display: flex; align-items: baseline; justify-content: space-between; }
.run-targets-head h3 { margin: 0; }
.run-targets-head span { font-size: var(--aat-font-sm); color: var(--aat-color-text-secondary); }
.run-target-list { border: 1px solid var(--aat-color-border); border-radius: var(--aat-radius-md); overflow: hidden; }
.run-target-scroll { max-height: 460px; overflow-y: auto; }
.run-target { display: flex; align-items: center; gap: var(--aat-space-2); padding: 10px var(--aat-space-3); border-top: 1px solid var(--aat-color-border); font-size: var(--aat-font-sm); cursor: pointer; }
.run-target.all { border-top: 0; background: var(--aat-color-subtle); }
.run-target.on { background: var(--aat-color-danger-soft); }
.run-target span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.run-target i { padding: 1px 7px; border-radius: var(--aat-radius-sm); background: var(--aat-color-danger); color: #fff; font-size: 11px; font-style: normal; font-weight: var(--aat-weight-semibold); white-space: nowrap; }
.run-target em { margin-left: auto; padding: 1px 6px; border-radius: var(--aat-radius-sm); background: var(--aat-color-danger-soft); color: var(--aat-color-danger); font-size: 11px; font-style: normal; white-space: nowrap; }

.run-main { display: flex; flex-direction: column; gap: var(--aat-space-4); min-width: 0; }
.run-auth { padding: var(--aat-space-4); border: 1px solid var(--aat-color-border); border-radius: var(--aat-radius-md); background: var(--aat-color-subtle); }
.run-auth-head { display: flex; align-items: center; justify-content: space-between; gap: var(--aat-space-2); }
.run-auth-head h3 { margin: 0; }
.run-auth-tabs { display: flex; gap: var(--aat-space-4); }
.run-auth-tabs button { padding: 6px 4px; border: 0; border-bottom: 2px solid transparent; background: none; color: var(--aat-color-text); font: inherit; font-size: var(--aat-font-sm); cursor: pointer; }
.run-auth-tabs button.active { border-bottom-color: var(--aat-color-danger); color: var(--aat-color-danger); font-weight: var(--aat-weight-semibold); }
.run-auth-tabs button:disabled { cursor: not-allowed; }
.run-auth-saved { display: flex; align-items: center; gap: var(--aat-space-2); margin: var(--aat-space-3) 0 var(--aat-space-2); font-size: var(--aat-font-sm); font-weight: var(--aat-weight-semibold); }
.run-auth-fields { display: grid; grid-template-columns: 1fr 1fr; gap: var(--aat-space-3); }
.run-auth-fields label { display: flex; flex-direction: column; gap: 4px; font-size: var(--aat-font-sm); font-weight: var(--aat-weight-semibold); color: var(--aat-color-text); }
.run-auth-fields input { height: 40px; padding: 0 var(--aat-space-3); border: 1px solid var(--aat-color-border); border-radius: var(--aat-radius-md); background: var(--aat-color-surface); color: var(--aat-color-text); font: inherit; font-weight: var(--aat-weight-regular); }

.run-auth-fields small { margin-left: 4px; font-weight: var(--aat-weight-regular); color: var(--aat-color-text-secondary); font-size: 11px; }
.run-auth-save { display: flex; align-items: center; justify-content: space-between; gap: var(--aat-space-3); margin-top: var(--aat-space-3); }
.run-auth-save .run-help { margin: 0; }
.run-auth-ok { color: var(--aat-color-success); font-size: var(--aat-font-sm); }
.run-full { display: inline-flex; align-items: center; gap: 6px; font-size: var(--aat-font-sm); color: var(--aat-color-text-secondary); cursor: pointer; }
.run-kind-scroll { overflow-x: auto; border: 1px solid var(--aat-color-border); border-radius: var(--aat-radius-md); }
.run-kind-table { width: 100%; min-width: 600px; border-collapse: collapse; font-size: var(--aat-font-sm); }
.run-kind-table th { padding: var(--aat-space-2); background: var(--aat-color-subtle); color: var(--aat-color-text-secondary); font-weight: var(--aat-weight-medium); font-size: var(--aat-font-xs); text-align: left; }
.run-kind-table td { padding: 9px var(--aat-space-2); border-top: 1px solid var(--aat-color-border); overflow: visible; text-overflow: clip; }
.run-kind-table .check { width: 40px; text-align: center; }
.run-kind-table tr.group td { padding: 6px var(--aat-space-2); background: var(--aat-color-subtle); color: var(--aat-color-text-secondary); font-size: var(--aat-font-xs); font-weight: var(--aat-weight-semibold); }
.run-kind-table .muted { color: var(--aat-color-text-secondary); font-variant-numeric: tabular-nums; white-space: nowrap; }
.run-kind-table tr.soon td:not(.check) { color: var(--aat-color-text-secondary); }
.run-kind-table small { margin-left: 6px; padding: 1px 6px; border-radius: var(--aat-radius-sm); background: var(--aat-color-subtle); border: 1px solid var(--aat-color-border); font-size: 10.5px; }
:global(.modal-footer .run-close) { color: var(--aat-color-danger); border-color: var(--aat-color-danger); }

@media (max-width: 860px) {
  .run-form-wide { grid-template-columns: minmax(0, 1fr); }
  .run-targets { position: static; }
  .run-target-scroll { max-height: 200px; }
  .run-auth-fields { grid-template-columns: 1fr; }
}
</style>
