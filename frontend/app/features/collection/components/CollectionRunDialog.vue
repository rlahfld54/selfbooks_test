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
    <form data-ui-collection-run-dialog
      class="run-form run-form-wide"
      @submit.prevent="submit"
    >
      <!-- 대상 사업체 -->
      <aside data-ui-collection-run-dialog class="run-targets">
        <div data-ui-collection-run-dialog class="run-targets-head">
          <h3 data-ui-collection-run-dialog>대상 사업체</h3>
          <span data-ui-collection-run-dialog>{{ picked.length }}개 선택</span>
        </div>
        <div data-ui-collection-run-dialog class="search-input">
          <UiIcon data-ui-collection-run-dialog
            name="search"
            :size="16"
          />
          <UiInput data-ui-collection-run-dialog
            v-model="search"
            aria-label="대상 사업체 검색"
            placeholder="상호·대표자·사업자번호 검색"
          />
        </div>
        <div data-ui-collection-run-dialog class="run-target-list">
          <label data-ui-collection-run-dialog class="run-target all">
            <input data-ui-collection-run-dialog
              type="checkbox"
              :checked="listed.length > 0 && listedChecked === listed.length"
              :indeterminate="listedChecked > 0 && listedChecked < listed.length"
              aria-label="대상 사업체 모두 선택"
              @change="toggleListed(($event.target as HTMLInputElement).checked)"
            >
            <b data-ui-collection-run-dialog>상호</b>
          </label>
          <div data-ui-collection-run-dialog class="run-target-scroll">
            <label data-ui-collection-run-dialog
              v-for="row in listed"
              :key="row.clientId"
              class="run-target"
              :class="{ on: clientIds.includes(row.clientId) }"
            >
              <input data-ui-collection-run-dialog
                type="checkbox"
                :checked="clientIds.includes(row.clientId)"
                @change="clientIds = toggle(clientIds, row.clientId, ($event.target as HTMLInputElement).checked)"
              >
              <span data-ui-collection-run-dialog>{{ row.name }}</span>
              <i data-ui-collection-run-dialog v-if="row.clientId === current">현재</i>
              <em data-ui-collection-run-dialog v-if="!row.hometaxReady">계정 미등록</em>
            </label>
            <p data-ui-collection-run-dialog
              v-if="!listed.length"
              class="run-help"
            >
              검색 결과가 없습니다.
            </p>
          </div>
        </div>
      </aside>

      <div data-ui-collection-run-dialog class="run-main">
        <!-- 인증 방식 -->
        <section data-ui-collection-run-dialog class="run-auth">
          <div data-ui-collection-run-dialog class="run-auth-head">
            <h3 data-ui-collection-run-dialog>인증 방식</h3>
            <div data-ui-collection-run-dialog
              class="run-auth-tabs"
              role="tablist"
              aria-label="인증 방식"
            >
              <button data-ui-collection-run-dialog
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
            <p data-ui-collection-run-dialog class="run-auth-saved">
              저장된 계정
              <UiBadge data-ui-collection-run-dialog :tone="single.hometaxReady ? 'success' : 'danger'">
                {{ single.hometaxReady ? '등록됨' : '미등록' }}
              </UiBadge>
            </p>
            <div data-ui-collection-run-dialog class="run-auth-fields">
              <label data-ui-collection-run-dialog>
                <span data-ui-collection-run-dialog>홈택스 아이디</span>
                <input data-ui-collection-run-dialog
                  v-model="account.hometaxId"
                  maxlength="50"
                  autocomplete="off"
                  placeholder="홈택스 아이디"
                >
              </label>
              <label data-ui-collection-run-dialog>
                <span data-ui-collection-run-dialog>홈택스 비밀번호</span>
                <input data-ui-collection-run-dialog
                  v-model="account.password"
                  type="password"
                  maxlength="100"
                  autocomplete="new-password"
                  :placeholder="single.hometaxReady ? '········ (바꿀 때만 입력)' : '홈택스 비밀번호'"
                >
              </label>
              <label data-ui-collection-run-dialog>
                <span data-ui-collection-run-dialog>주민번호 앞 6자리 <small data-ui-collection-run-dialog>계정에 따라</small></span>
                <input data-ui-collection-run-dialog
                  v-model="account.juminFront6"
                  inputmode="numeric"
                  maxlength="6"
                  autocomplete="off"
                  placeholder="2차 인증이 필요한 계정만"
                >
              </label>
              <label data-ui-collection-run-dialog>
                <span data-ui-collection-run-dialog>주민번호 뒤 1자리 <small data-ui-collection-run-dialog>계정에 따라</small></span>
                <input data-ui-collection-run-dialog
                  v-model="account.juminLast1"
                  inputmode="numeric"
                  maxlength="1"
                  autocomplete="off"
                  placeholder="예: 1"
                >
              </label>
            </div>
            <div data-ui-collection-run-dialog class="run-auth-save">
              <span data-ui-collection-run-dialog
                v-if="accountError"
                class="collection-invalid"
                role="alert"
              >{{ accountError }}</span>
              <span data-ui-collection-run-dialog
                v-else-if="accountMessage"
                class="run-auth-ok"
                role="status"
              >{{ accountMessage }}</span>
              <span data-ui-collection-run-dialog
                v-else
                class="run-help"
              >비밀번호는 서버에만 암호화해 두고 화면에는 다시 보이지 않습니다.</span>
              <UiButton data-ui-collection-run-dialog
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
          <p data-ui-collection-run-dialog
            v-else
            class="run-help"
          >
            각 사업체에 저장된 홈택스 계정으로 순차 로그인합니다.
          </p>
        </section>

        <!-- 수집 항목 -->
        <section data-ui-collection-run-dialog>
          <div data-ui-collection-run-dialog class="run-section-head">
            <h3 data-ui-collection-run-dialog>수집 항목</h3>
            <label data-ui-collection-run-dialog class="run-full">
              <input data-ui-collection-run-dialog
                v-model="full"
                type="checkbox"
              >
              기간 전체 재수집
            </label>
          </div>
          <div data-ui-collection-run-dialog class="run-kind-scroll">
            <table data-ui-collection-run-dialog class="run-kind-table">
              <thead data-ui-collection-run-dialog>
                <tr data-ui-collection-run-dialog>
                  <th data-ui-collection-run-dialog class="check">
                    <input data-ui-collection-run-dialog
                      type="checkbox"
                      :checked="allOn"
                      :indeterminate="items.length > 0 && !allOn"
                      aria-label="수집 항목 모두 선택"
                      @change="items = ($event.target as HTMLInputElement).checked ? readyItems.map(item => item.key) : []"
                    >
                  </th>
                  <th data-ui-collection-run-dialog>수집 항목</th>
                  <th data-ui-collection-run-dialog>조회 기간</th>
                  <th data-ui-collection-run-dialog>기수집 안내</th>
                </tr>
              </thead>
              <tbody data-ui-collection-run-dialog
                v-for="group in groups"
                :key="group.key"
              >
                <tr data-ui-collection-run-dialog class="group">
                  <td data-ui-collection-run-dialog class="check">
                    <input data-ui-collection-run-dialog
                      type="checkbox"
                      :checked="groupState(group).all"
                      :indeterminate="groupState(group).some"
                      :disabled="groupState(group).disabled"
                      :aria-label="group.label + ' 모두 선택'"
                      @change="toggleGroup(group, ($event.target as HTMLInputElement).checked)"
                    >
                  </td>
                  <td data-ui-collection-run-dialog colspan="3">
                    {{ group.label }}
                  </td>
                </tr>
                <tr data-ui-collection-run-dialog
                  v-for="item in group.items"
                  :key="item.key"
                  :class="{ soon: !item.ready }"
                >
                  <td data-ui-collection-run-dialog class="check">
                    <input data-ui-collection-run-dialog
                      type="checkbox"
                      :checked="items.includes(item.key)"
                      :disabled="!item.ready"
                      :aria-label="item.label"
                      @change="items = toggle(items, item.key, ($event.target as HTMLInputElement).checked)"
                    >
                  </td>
                  <td data-ui-collection-run-dialog>
                    {{ item.label }}
                    <small data-ui-collection-run-dialog
                      v-if="!item.ready"
                      title="팀장님 스크랩 API 에 아직 없는 자료입니다"
                    >준비 중</small>
                  </td>
                  <td data-ui-collection-run-dialog class="muted">
                    {{ item.period }}
                  </td>
                  <td data-ui-collection-run-dialog class="muted">
                    {{ notice(item) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p data-ui-collection-run-dialog class="run-help">
            매입매출은 세금계산서 · 계산서 · 현금영수증 · 신용카드 매출/매입을 한 번에 받습니다(신용카드 매출은 분기별 월합계, 판매대행 포함).
            「기간 전체 재수집」을 끄면 종류마다 이미 받은 마지막 날 이후만 받습니다.
          </p>
        </section>

        <p data-ui-collection-run-dialog
          v-if="maintenance"
          class="run-warning"
          role="note"
        >
          지금은 홈택스 점검시간(한국시간 00~06시)이라 홈택스 자료는 실패합니다. 06시 이후에 시작해 주세요.
        </p>
        <p data-ui-collection-run-dialog
          v-if="missing.length && needsLogin"
          class="run-warning"
          role="note"
        >
          <b data-ui-collection-run-dialog>{{ missing.map(row => row.name).join(', ') }}</b>은(는) 홈택스 계정이 등록되어 있지 않아 기본정보 말고는 실패합니다.
        </p>
        <p data-ui-collection-run-dialog class="run-help">
          홈택스는 비밀번호를 5회 틀리면 계정을 잠그므로 인증 오류는 자동으로 다시 시도하지 않습니다. 한 사업체는 한 번에 한 작업만 돕니다.
        </p>
        <p data-ui-collection-run-dialog
          v-if="error"
          class="collection-alert"
          role="alert"
        >
          {{ error }}
        </p>
      </div>
    </form>
    <template #footer>
      <UiButton data-ui-collection-run-dialog
        variant="outline"
        class="run-close"
        @click="emit('close')"
      >
        닫기
      </UiButton>
      <UiButton data-ui-collection-run-dialog
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
