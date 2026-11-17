<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import ClientDirectory from '~/features/client-directory/ClientDirectory.vue'
import { managementSession } from './session'
import { filterClients, assignedPeople } from './management'
import { roles } from './data'
import type { Client, Staff } from './data'
import ManagementBadge from './ManagementBadge.vue'
import ManagementDialog from './ManagementDialog.vue'

const props = defineProps<{ page: 'mypage' | 'organization' | 'clients' }>()
const { state, navigate, activeTab, setDirty, density } = useWorkspaceContext()
const route = useRoute()
const router = useRouter()
const data = managementSession(state)
const tab = ref(props.page === 'mypage' ? 'info' : 'basic')
const live = computed(() => props.page === 'clients' && route.query.source === 'live')
const query = ref('')
const biz = ref('')
const kind = ref('')
const status = ref('')
const person = ref('')
const review = ref('')
const team = ref('')
const role = ref('')
const selectedClient = ref<Client>()
const selectedStaff = ref<Staff>()
const modal = ref('')
const message = ref('')
const form = reactive<Record<string, string>>({})
const secondary = ref<string[]>([])
const staffQuery = ref('')
const branchId = ref('')
const editing = ref(false)
const me = computed(() => data.staff[0]!)
const currentTab = activeTab.value
const titles = { mypage: '마이페이지', organization: '조직 설정', clients: '수임업체 관리' }
const pageCopy = {
  mypage: ['MY ACCOUNT', '내 계정 정보와 소속 조직, 보안 설정을 관리합니다.'],
  organization: ['ORGANIZATION', '회계법인 정보, 구성원, 역할 및 사무소를 관리합니다.'],
  clients: ['CLIENT MANAGEMENT', '조직이 관리하는 수임업체를 조회하고 담당자 및 검토 상태를 관리합니다.'],
}
const clientColumns = ['업체명', '사업자등록번호', '구분', '대표자명', '주담당자', '보조담당자', '수임 상태', '회사정보', '환경설정', '관리']
const staffColumns = ['이름', '로그인 ID', '이메일', '부서/팀', '직책', '시스템 권한', '계정 상태', '가입일', '관리']
const teams = ['세무1팀', '세무2팀', '관리팀']
const clientTypes = ['개인', '법인']
const clientStatuses = ['수임 중', '수임 종료', '등록 대기']
const staffStatuses = ['활성', '초대 대기', '비활성']
const reviewStatuses = ['검토 전', '검토 중', '검토 완료']
const profileFields = [
  ['id', '사용자 ID'], ['login', '로그인 ID'], ['name', '이름'], ['email', '이메일'],
  ['phone', '휴대전화'], ['office', '소속 조직'], ['team', '부서/팀'], ['title', '직책'], ['role', '시스템 권한'],
] as const
const securityActions = [
  ['비밀번호 변경', '마지막 변경: 2026.09.12', '비밀번호 변경', '비밀번호 변경'],
  ['2단계 인증', '현재 설정되지 않음 · 보안 강화를 위해 권장합니다', '설정하기', '2단계 인증 설정'],
  ['최근 로그인', '2026.11.17 09:12 · Windows / Chrome', '로그인 기록', '로그인 기기 및 세션'],
  ['로그인 세션 및 기기', '현재 사용 중인 기기를 포함하여 2개 세션이 있습니다', '기기 관리', '로그인 기기 및 세션'],
  ['다른 기기에서 로그아웃', '현재 기기를 제외한 모든 기기에서 로그아웃합니다.', '로그아웃', '다른 기기에서 로그아웃'],
] as const
const reviewLinks = [
  ['company', '회사등록'], ['settings', '환경등록'], ['voucher', '전표입력'], ['accounts', '계정과목'],
] as const
const editableProfile = ['name', 'email', 'phone']
const organizationName = computed(() => data.organization['회계법인명/사무소명'] || '—')
const tabs = computed(() => props.page === 'mypage'
  ? [['info', '내 정보'], ['organization', '소속 조직'], ['security', '보안 설정']] as const
  : [['basic', '조직 기본정보'], ['staff', '직원 관리'], ['permissions', '권한 관리'], ['branches', '본사/지점 관리']] as const)
const clients = computed(() => filterClients(data.clients, query.value, biz.value, kind.value, status.value, person.value, review.value))
const staff = computed(() => data.staff.filter(row => (row.name + row.login + row.email).toLowerCase().includes(query.value.trim().toLowerCase())
  && (!team.value || row.team === team.value) && (!role.value || row.role === role.value) && (!status.value || row.status === status.value)))
const activeStaff = computed(() => data.staff.filter(row => row.status === '활성'))
const staffNames = computed(() => [...new Set(data.staff.map(row => row.name))])
const clientStats = computed(() => [
  ['전체 수임업체', data.clients.length],
  ['수임 중인 업체', data.clients.filter(row => row.status === '수임 중').length],
  ['등록정보 검토 대기', data.clients.filter(row => row.company !== '검토 완료' || row.environment !== '검토 완료').length],
  ['수임 종료 업체', data.clients.filter(row => row.status === '수임 종료').length],
] as const)
const assignedClients = computed(() => {
  const name = selectedStaff.value?.name
  return name ? data.clients.filter(row => row.primary === name || row.secondary.includes(name)) : []
})
const reviewSteps = computed(() => [
  ['회사정보 검토', selectedClient.value?.company || ''],
  ['환경정보 검토', selectedClient.value?.environment || ''],
  ['적요 및 계정과목 등록', selectedClient.value?.chart || ''],
] as const)
const profileOrganizationRows = computed(() => [
  [['조직명', organizationName.value], ...['사업자등록번호', '대표자명', '대표전화'].map(label => [label, data.organization[label]])],
  [...['대표 이메일', '사업장 주소'].map(label => [label, data.organization[label]]), ['소속 부서', me.value.team], ['조직 내 역할', me.value.role]],
])
const permissionRows = ['조직 정보 수정', '직원 초대 및 관리', '수임업체 등록', '수임업체 정보 수정', '담당 수임업체 조회', '전표 조회 및 입력', '마감 처리', '신고 관련 업무']
const orgSections = [ ['사업자 정보', ['회계법인명/사무소명', '사업자등록번호', '법인등록번호', '대표자명', '사업장 주소', '업태', '종목']], ['연락처 정보', ['대표전화', '대표 이메일', '팩스번호']], ['세무대리 관련 정보', ['세무대리인 관리번호', '사무소 구분', '기타 등록정보']] ] as const
const fields = computed(() => {
  if (modal.value.includes('지점') || modal.value === '사무소 수정') return [['name', '지점명', '지점명을 입력하세요'], ['address', '사업장 주소', '사업장 주소'], ['phone', '대표 연락처', '02-0000-0000']] as const
  if (modal.value === '비밀번호 변경') return [['old', '현재 비밀번호', '현재 비밀번호'], ['new', '새 비밀번호', '새 비밀번호'], ['confirm', '비밀번호 확인', '다시 입력']] as const
  return []
})
const modalTitle = computed(() => modal.value === '담당자 지정' && selectedClient.value
  ? `담당자 지정 · ${selectedClient.value.name}`
  : modal.value)
const filteredActiveStaff = computed(() => activeStaff.value.filter(row => (row.name + row.team).includes(staffQuery.value.trim())))
let toastTimer: ReturnType<typeof setTimeout> | undefined

watch(() => [route.query.client, live.value] as const, ([id, liveMode]) => {
  if (props.page === 'clients') selectedClient.value = liveMode ? undefined : data.clients.find(row => row.id === id)
}, { immediate: true })

function closeClient() {
  selectedClient.value = undefined
  if (route.query.client) void router.replace({ path: route.path })
}
function showToast(text: string) {
  clearTimeout(toastTimer)
  message.value = text
  toastTimer = setTimeout(() => { message.value = '' }, 2700)
}
function resetFilters() { query.value = ''; biz.value = ''; kind.value = ''; status.value = ''; person.value = ''; review.value = ''; team.value = ''; role.value = '' }
function open(title: string) {
  clearTimeout(toastTimer)
  Object.keys(form).forEach(key => delete form[key])
  const client = title === '담당자 지정' ? selectedClient.value : undefined
  Object.assign(form, { type: '개인', primary: client?.primary || activeStaff.value[0]?.name || '', team: '세무1팀', role: selectedStaff.value?.role || roles[1], status: '활성', start: '2026-11-17' })
  secondary.value = [...(client?.secondary || [])]
  staffQuery.value = ''; message.value = ''; modal.value = title
}
function closeModal() { modal.value = ''; message.value = ''; Object.keys(form).forEach(key => delete form[key]) }
function beginEdit() {
  clearTimeout(toastTimer)
  message.value = ''
  Object.keys(form).forEach(key => delete form[key])
  Object.assign(form, props.page === 'mypage' ? me.value : data.organization)
  editing.value = true
  setDirty(currentTab, true)
}
function endEdit(save: boolean) {
  if (save) {
    if (props.page === 'mypage') {
      if (!form.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email || '')) { message.value = '이름과 올바른 이메일을 입력해 주세요.'; return }
      const previousName = me.value.name
      for (const client of data.clients) {
        if (client.primary === previousName) client.primary = form.name.trim()
        client.secondary = client.secondary.map(name => name === previousName ? form.name!.trim() : name)
      }
      Object.assign(me.value, { name: form.name.trim(), email: form.email.trim(), phone: form.phone || '' })
    } else Object.assign(data.organization, form)
    showToast('변경사항을 화면에 저장했습니다. 새로고침하면 초기화됩니다.')
  } else message.value = ''
  editing.value = false
  setDirty(currentTab, false)
}
function changeTab(value: string) { if (editing.value) endEdit(false); tab.value = value; resetFilters() }
function save() {
  try {
    if (modal.value === '수임업체 등록') {
      if (!form.name?.trim() || !form.biz?.trim() || !form.ceo?.trim()) throw new Error('업체명, 사업자등록번호, 대표자명을 입력해 주세요.')
      const assignment = assignedPeople(data.staff, form.primary || '', secondary.value)
      const client: Client = { id: `C${String(data.clients.length + 1).padStart(3, '0')}`, name: form.name.trim(), biz: form.biz.trim(), ceo: form.ceo.trim(), type: form.type || '개인', ...assignment, status: '등록 대기', company: '검토 전', environment: '검토 전', chart: '검토 전', start: form.start || '', end: '', address: '주소 미입력' }
      data.clients.unshift(client); selectedClient.value = client
    } else if (modal.value === '담당자 지정' && selectedClient.value) {
      Object.assign(selectedClient.value, assignedPeople(data.staff, form.primary || '', secondary.value))
    } else if (modal.value === '직원 초대') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email || '')) throw new Error('올바른 이메일을 입력해 주세요.')
      data.staff.push({ id: `U${data.staff.length + 1}`, name: '초대 직원', login: '미설정', email: form.email!.trim(), team: form.team || '', title: form.title || '직원', role: form.role || roles[1]!, status: '초대 대기', joined: '2026-11-17' })
    } else if (modal.value === '직원 권한 변경' && selectedStaff.value) selectedStaff.value.role = form.role || roles[1]!
    else if (modal.value === '직원 계정 비활성화' && selectedStaff.value) selectedStaff.value.status = '비활성'
    else if (modal.value === '지점 추가' || modal.value === '사무소 수정') {
      if (!form.name?.trim()) throw new Error('지점명을 입력해 주세요.')
      const branch = data.branches.find(row => row.id === branchId.value)
      const values = { name: form.name.trim(), address: form.address || '', phone: form.phone || '', status: form.status || '활성' }
      if (branch && modal.value === '사무소 수정') Object.assign(branch, values)
      else data.branches.push({ id: `B${data.branches.length + 1}`, ...values, kind: '지점', count: '0' })
    } else {
      if (modal.value === '비밀번호 변경' && (!form.old || !form.new || form.new !== form.confirm)) throw new Error('현재 비밀번호와 일치하는 새 비밀번호 확인을 입력해 주세요.')
      closeModal()
      showToast('보안 기능은 화면 시뮬레이션입니다. 실제 계정에는 적용되지 않습니다.')
      return
    }
    closeModal()
    showToast('화면 데이터에 반영했습니다. 새로고침하면 초기화됩니다.')
  } catch (error) { message.value = error instanceof Error ? error.message : '입력값을 확인해 주세요.' }
}
function editBranch(id: string) { branchId.value = id; open('사무소 수정'); Object.assign(form, data.branches.find(row => row.id === id)) }
async function go(id: 'company' | 'settings' | 'accounts' | 'voucher' | 'organization') { await navigate(id) }
onBeforeUnmount(() => {
  clearTimeout(toastTimer)
  if (editing.value) setDirty(currentTab, false)
})
</script>

<template>
  <div class="page management" :class="{ narrow: page === 'mypage', 'management-live': live }">
    <template v-if="live">
      <NuxtLink class="small-link live-back" to="/client-directory">← 수임업체 관리 시안</NuxtLink>
      <ClientDirectory />
    </template>
    <template v-else>
      <header class="page-header">
        <div>
          <div class="eyebrow">{{ pageCopy[page][0] }}</div>
          <h1>{{ titles[page] }}</h1>
          <p class="sub">{{ pageCopy[page][1] }}</p>
        </div>
        <div v-if="page === 'clients'" class="actions">
          <button class="btn" @click="showToast('데이터는 프론트엔드 Mock Data입니다.')">ⓘ 화면 안내</button>
          <button class="btn primary" @click="open('수임업체 등록')">+ 수임업체 등록</button>
        </div>
      </header>

      <template v-if="page === 'clients'">
        <div class="stats">
          <div v-for="[label, count] in clientStats" :key="label" class="panel stat">
            <div class="hint">{{ label }}</div>
            <strong>{{ count }}<span class="stat-note">개 업체</span></strong>
          </div>
        </div>
        <section class="panel table-panel" aria-label="수임업체 목록">
          <div class="toolbar">
            <div class="search-box">
              <span aria-hidden="true">⌕</span>
              <input v-model="query" class="control" aria-label="업체명 검색" placeholder="업체명 검색">
            </div>
            <div class="search-box business-search">
              <span aria-hidden="true">⌕</span>
              <input v-model="biz" class="control" aria-label="사업자번호 검색" placeholder="사업자번호 검색">
            </div>
            <select v-model="kind" class="control" aria-label="개인/법인">
              <option value="">개인/법인</option>
              <option v-for="value in clientTypes" :key="value">{{ value }}</option>
            </select>
            <select v-model="status" class="control" aria-label="수임 상태">
              <option value="">수임 상태</option>
              <option v-for="value in clientStatuses" :key="value">{{ value }}</option>
            </select>
            <select v-model="person" class="control" aria-label="담당 직원">
              <option value="">담당 직원</option>
              <option v-for="value in staffNames" :key="value">{{ value }}</option>
            </select>
            <select v-model="review" class="control" aria-label="검토 상태">
              <option value="">검토 상태</option>
              <option v-for="value in reviewStatuses" :key="value">{{ value }}</option>
            </select>
            <button class="btn sm" @click="resetFilters">↻ 초기화</button>
          </div>
          <div class="toolbar result-toolbar">
            <span class="count-line">전체 <strong>{{ clients.length }}</strong>개 업체 표시</span>
            <span class="muted-note">업체 행을 클릭하면 우측 상세정보가 열립니다.</span>
          </div>
          <div class="table-scroll">
            <table class="management-table" :class="{ compact: density === 'compact' }">
              <caption class="sr-only">수임업체 목록</caption>
              <thead><tr><th v-for="label in clientColumns" :key="label" scope="col">{{ label }}</th></tr></thead>
              <tbody>
                <tr v-for="client in clients" :key="client.id" @click="selectedClient = client">
                  <td><div class="table-name">{{ client.name }}</div><div class="table-sub">{{ client.id }}</div></td>
                  <td>{{ client.biz }}</td>
                  <td><ManagementBadge :value="client.type" /></td>
                  <td>{{ client.ceo }}</td>
                  <td>{{ client.primary }}</td>
                  <td>{{ client.secondary.join(', ') || '—' }}</td>
                  <td><ManagementBadge :value="client.status" /></td>
                  <td><ManagementBadge :value="client.company" /></td>
                  <td><ManagementBadge :value="client.environment" /></td>
                  <td><button class="small-link" :aria-label="client.name + ' 상세 보기'" @click.stop="selectedClient = client">상세 보기 →</button></td>
                </tr>
                <tr v-if="!clients.length"><td colspan="10" class="empty">검색 조건에 맞는 수임업체가 없습니다. 필터를 초기화해보세요.</td></tr>
              </tbody>
            </table>
          </div>
          <footer class="table-footer">
            <span>{{ clients.length }}개 업체 · Mock Data</span>
            <NuxtLink class="small-link" to="/client-directory?source=live">등록된 수임업체 조회</NuxtLink>
            <div class="pagination"><span class="page-num active" aria-current="page">1</span></div>
          </footer>
        </section>
      </template>

      <template v-else>
        <section v-if="page === 'mypage'" class="panel profile-banner">
          <span class="avatar big-avatar">{{ me.name.charAt(0) }}</span>
          <div class="profile-heading">
            <h2>{{ me.name }} <span class="profile-title">{{ me.title }}</span></h2>
            <div class="meta"><span>{{ me.login }}</span><span>·</span><span>{{ me.email }}</span><span>·</span><span>{{ me.team }}</span></div>
            <div class="profile-badges"><ManagementBadge :value="me.role" /><ManagementBadge :value="me.status" /></div>
          </div>
          <div class="spacer"></div>
          <span class="badge blue">{{ organizationName }}</span>
        </section>
        <section v-else class="panel org-header">
          <div class="org-emblem">원</div>
          <div>
            <h2>{{ organizationName }} <ManagementBadge value="활성" /></h2>
            <div class="org-meta">
              <span>사업자등록번호 {{ data.organization['사업자등록번호'] }}</span>
              <span>대표 {{ data.organization['대표자명'] }}</span>
              <span>본사 · 서울특별시 금천구</span>
            </div>
          </div>
          <span class="spacer"></span>
          <div class="org-num"><b>{{ data.staff.length }}</b><span>소속 직원</span></div>
          <div class="org-num"><b>{{ data.clients.length }}</b><span>수임업체</span></div>
          <button class="btn" :disabled="editing" @click="changeTab('basic'); beginEdit()">조직 정보 수정</button>
        </section>

        <section class="panel">
          <nav class="tabs" :aria-label="titles[page] + ' 메뉴'">
            <button v-for="[id, label] in tabs" :key="id" :class="{ active: tab === id }" :aria-pressed="tab === id" @click="changeTab(id)">{{ label }}</button>
          </nav>
          <div class="tab-body" :class="{ 'org-tab-body': page === 'organization' }">
            <template v-if="page === 'mypage'">
              <template v-if="tab === 'info'">
                <div class="section-heading">
                  <div><h3>기본 정보</h3><p>개인 연락처와 계정 정보를 확인하고 수정할 수 있습니다.</p></div>
                  <button v-if="!editing" class="btn" @click="beginEdit">✎ 정보 수정</button>
                </div>
                <form @submit.prevent="endEdit(true)">
                  <div class="form-grid">
                    <div v-for="[key, label] in profileFields" :key="key" class="field">
                      <label :for="'profile-' + key">{{ label }}</label>
                      <input v-if="editing && editableProfile.includes(key)" :id="'profile-' + key" v-model="form[key]">
                      <input v-else :id="'profile-' + key" :value="key === 'office' ? organizationName : me[key]" disabled>
                      <div v-if="!editing || !editableProfile.includes(key)" class="help">조직에서 관리하는 정보 · 읽기 전용</div>
                    </div>
                  </div>
                  <p v-if="editing && message" class="alert management-feedback" role="alert">{{ message }}</p>
                  <div v-if="editing" class="form-footer">
                    <button type="button" class="btn" @click="endEdit(false)">취소</button>
                    <button class="btn primary">변경사항 저장</button>
                  </div>
                </form>
              </template>
              <template v-else-if="tab === 'organization'">
                <div class="section-heading">
                  <div><h3>소속 조직 정보</h3><p>조직 설정에서 관리하는 정보입니다.</p></div>
                  <button class="btn primary" @click="go('organization')">조직 설정으로 이동 →</button>
                </div>
                <div class="two-col">
                  <div v-for="(column, index) in profileOrganizationRows" :key="index">
                    <div v-for="[label, value] in column" :key="label" class="info-row">
                      <span class="label">{{ label }}</span>
                      <span class="value"><ManagementBadge v-if="label === '조직 내 역할'" :value="value || ''" /><template v-else>{{ value || '—' }}</template></span>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="section-heading"><div><h3>계정 보안</h3><p>로그인 정보와 기기 접근 상태를 확인합니다.</p></div></div>
                <div v-for="[label, description, action, dialog] in securityActions" :key="label" class="settings-row">
                  <div><b>{{ label }}</b><p>{{ description }}</p></div>
                  <button class="btn sm" :class="{ danger: action === '로그아웃' }" @click="open(dialog)">{{ action }}</button>
                </div>
              </template>
            </template>
            <template v-else-if="tab === 'basic'">
              <div class="section-heading">
                <div><h3>조직 정보</h3><p>수임업체 정보와 구분되는 회계법인 자체의 등록정보입니다.</p></div>
                <button v-if="!editing" class="btn" @click="beginEdit">✎ 수정하기</button>
              </div>
              <form @submit.prevent="endEdit(true)">
                <section v-for="[section, labels] in orgSections" :key="section" class="panel info-section">
                  <h3>{{ section }}</h3>
                  <div :class="editing ? 'form-grid' : 'group-grid'">
                    <div v-for="(label, index) in labels" :key="label" class="field">
                      <label v-if="editing" :for="'org-' + section + index">{{ label }}</label>
                      <input v-if="editing" :id="'org-' + section + index" v-model="form[label]">
                      <template v-else><span class="field-label">{{ label }}</span><div class="display">{{ data.organization[label] || '—' }}</div></template>
                    </div>
                  </div>
                </section>
                <div v-if="editing" class="form-footer">
                  <button type="button" class="btn" @click="endEdit(false)">취소</button>
                  <button class="btn primary">변경사항 저장</button>
                </div>
              </form>
            </template>
            <template v-else-if="tab === 'staff'">
              <div class="section-heading">
                <div><h3>직원 관리</h3><p>총 {{ data.staff.length }}명의 소속 직원 및 계정 상태를 관리합니다.</p></div>
                <button class="btn primary" @click="open('직원 초대')">+ 직원 초대</button>
              </div>
              <div class="panel table-panel">
                <div class="toolbar">
                  <div class="search-box"><span aria-hidden="true">⌕</span><input v-model="query" class="control" aria-label="이름, ID, 이메일 검색" placeholder="이름, ID, 이메일 검색"></div>
                  <select v-model="team" class="control" aria-label="전체 부서">
                    <option value="">전체 부서</option><option v-for="value in teams" :key="value">{{ value }}</option>
                  </select>
                  <select v-model="role" class="control" aria-label="전체 권한">
                    <option value="">전체 권한</option><option v-for="value in roles" :key="value">{{ value }}</option>
                  </select>
                  <select v-model="status" class="control" aria-label="전체 상태">
                    <option value="">전체 상태</option><option v-for="value in staffStatuses" :key="value">{{ value }}</option>
                  </select>
                  <span class="count-line">{{ staff.length }}명 표시</span>
                </div>
                <div class="table-scroll">
                  <table class="management-table" :class="{ compact: density === 'compact' }">
                    <caption class="sr-only">직원 목록</caption>
                    <thead><tr><th v-for="label in staffColumns" :key="label" scope="col">{{ label }}</th></tr></thead>
                    <tbody>
                      <tr v-for="employee in staff" :key="employee.id" @click="selectedStaff = employee">
                        <td class="table-name">{{ employee.name }}</td>
                        <td>{{ employee.login }}</td><td>{{ employee.email }}</td><td>{{ employee.team }}</td><td>{{ employee.title }}</td>
                        <td><ManagementBadge :value="employee.role" /></td><td><ManagementBadge :value="employee.status" /></td><td>{{ employee.joined }}</td>
                        <td><button class="small-link" :aria-label="employee.name + ' 상세 보기'" @click.stop="selectedStaff = employee">상세 보기 →</button></td>
                      </tr>
                      <tr v-if="!staff.length"><td colspan="9" class="empty">검색 조건에 해당하는 직원이 없습니다.</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </template>
            <template v-else-if="tab === 'permissions'">
              <div class="section-heading">
                <div><h3>역할별 권한 매트릭스</h3><p>기본 역할 예시이며 실제 서비스의 권한 정책으로 확정된 내용은 아닙니다.</p></div>
                <span class="badge orange">정책 확정 전</span>
              </div>
              <div class="alert management-notice">본 표는 화면 검증용 가상 권한 구성입니다. 실제 권한 부여 및 서버 접근제어는 구현하지 않았습니다.</div>
              <div class="panel table-scroll">
                <table class="management-table perm-table">
                  <thead><tr><th scope="col">업무 기능</th><th scope="col">조직 관리자</th><th scope="col">일반 사용자</th></tr></thead>
                  <tbody>
                    <tr v-for="(label, index) in permissionRows" :key="label">
                      <td>{{ label }}</td><td><span class="check" aria-label="허용">✓</span></td>
                      <td><span v-if="[0, 1, 6].includes(index)" class="cross" aria-label="미허용">—</span><span v-else class="check" aria-label="허용">✓</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
            <template v-else>
              <div class="section-heading">
                <div><h3>본사 및 지점</h3><p>회계법인 산하의 사무소별 주소와 직원을 관리합니다.</p></div>
                <button class="btn primary" @click="open('지점 추가')">+ 지점 추가</button>
              </div>
              <div class="location-cards">
                <section v-for="branch in data.branches" :key="branch.id" class="panel location-card">
                  <div class="location-heading"><h3>{{ branch.name }}</h3><ManagementBadge :value="branch.kind" /></div>
                  <p>{{ branch.address }}<br>{{ branch.phone }}<br><ManagementBadge :value="branch.status" /></p>
                  <div class="loc-count"><b>{{ branch.count }}명</b>소속 직원 <button class="small-link" @click="editBranch(branch.id)">정보 수정 →</button></div>
                </section>
              </div>
            </template>
          </div>
        </section>
      </template>
    </template>

    <ManagementDialog v-if="selectedClient && !live" :label="selectedClient.name" drawer @close="closeClient">
      <template #heading>
        <div>
          <span class="eyebrow">CLIENT DETAILS · {{ selectedClient.id }}</span>
          <h2>{{ selectedClient.name }}</h2>
          <div class="drawer-badges"><ManagementBadge :value="selectedClient.type" /><ManagementBadge :value="selectedClient.status" /></div>
        </div>
      </template>
      <section class="drawer-section">
        <h3>업체 기본정보</h3>
        <div v-for="[label, value] in [['사업자등록번호', selectedClient.biz], ['대표자명', selectedClient.ceo], ['사업장 주소', selectedClient.address]]" :key="label" class="info-row">
          <span class="label">{{ label }}</span><span class="value">{{ value }}</span>
        </div>
      </section>
      <section class="drawer-section">
        <div class="section-heading drawer-section-heading"><h3>수임 정보</h3><button class="small-link" @click="open('담당자 지정')">담당자 변경 →</button></div>
        <div class="info-row"><span class="label">수임 상태</span><ManagementBadge :value="selectedClient.status" /></div>
        <div v-for="[label, value] in [['수임 시작일', selectedClient.start], ['수임 종료일', selectedClient.end], ['주담당자', selectedClient.primary], ['보조담당자', selectedClient.secondary.join(', ')]]" :key="label" class="info-row">
          <span class="label">{{ label }}</span><span class="value">{{ value || '—' }}</span>
        </div>
      </section>
      <section class="drawer-section review-progress">
        <h3>설정 진행 상태</h3>
        <div v-for="[label, value] in reviewSteps" :key="label" class="progress-item">
          <div class="title"><strong>{{ label }}</strong><ManagementBadge :value="value" /></div>
          <div class="progress-bar" aria-hidden="true">
            <div class="progress-fill" :class="{ complete: value === '검토 완료', ongoing: value === '검토 중' }"></div>
          </div>
        </div>
      </section>
      <section class="drawer-section">
        <h3>업무 바로가기</h3>
        <button v-for="[id, label] in reviewLinks" :key="id" class="link-line" @click="go(id)">{{ label }} 화면으로 이동 <span>↗</span></button>
      </section>
      <template #footer>
        <button class="btn" @click="open('담당자 지정')">담당자 지정</button>
        <button class="btn primary" @click="go('company')">회사정보 검토 →</button>
      </template>
    </ManagementDialog>

    <ManagementDialog v-if="selectedStaff" :label="selectedStaff.name" drawer @close="selectedStaff = undefined">
      <template #heading>
        <div><div class="eyebrow">EMPLOYEE DETAILS</div><h2>{{ selectedStaff.name }} <ManagementBadge :value="selectedStaff.status" /></h2><p class="sub">{{ selectedStaff.email }}</p></div>
      </template>
      <section class="drawer-section">
        <h3>직원 기본정보</h3>
        <div v-for="[label, value] in [['로그인 ID', selectedStaff.login], ['부서/팀', selectedStaff.team], ['직책', selectedStaff.title], ['조직명', organizationName], ['시스템 역할', selectedStaff.role], ['가입일', selectedStaff.joined]]" :key="label" class="info-row">
          <span class="label">{{ label }}</span>
          <span class="value"><ManagementBadge v-if="label === '시스템 역할'" :value="value || ''" /><template v-else>{{ value }}</template></span>
        </div>
      </section>
      <section class="drawer-section">
        <h3>담당 수임업체 · {{ assignedClients.length }}개</h3>
        <NuxtLink v-for="client in assignedClients" :key="client.id" class="link-line" :to="{ path: '/client-directory', query: { client: client.id } }">{{ client.name }} <span>상세 →</span></NuxtLink>
        <p v-if="!assignedClients.length" class="sub">지정된 업체가 없습니다.</p>
      </section>
      <template #footer>
        <button class="btn" @click="open('직원 권한 변경')">권한 변경</button>
        <button class="btn danger" @click="open('직원 계정 비활성화')">계정 비활성화</button>
      </template>
    </ManagementDialog>

    <ManagementDialog v-if="modal" :label="modalTitle" @close="closeModal">
      <form id="management-form" @submit.prevent="save">
        <template v-if="modal === '수임업체 등록'">
          <div class="alert management-notice">기본정보를 먼저 등록한 뒤 기존 회사등록·환경등록 화면에서 검토하는 흐름입니다.</div>
          <div class="form-grid">
            <div class="field"><label for="client-name">업체명 *</label><input id="client-name" v-model="form.name" placeholder="예: 주식회사 새봄"></div>
            <div class="field"><label for="client-business">사업자등록번호 *</label><input id="client-business" v-model="form.biz" placeholder="000-00-00000"></div>
            <div class="field"><label for="client-type">개인/법인 구분</label><select id="client-type" v-model="form.type"><option v-for="value in clientTypes" :key="value">{{ value }}</option></select></div>
            <div class="field"><label for="client-ceo">대표자명 *</label><input id="client-ceo" v-model="form.ceo" placeholder="대표자명"></div>
            <div class="field"><label for="client-primary">주담당자</label><select id="client-primary" v-model="form.primary"><option v-for="employee in activeStaff" :key="employee.id">{{ employee.name }}</option></select></div>
            <div class="field"><label for="client-start">수임 시작일</label><input id="client-start" v-model="form.start" type="date"></div>
          </div>
        </template>
        <template v-if="modal === '담당자 지정'">
          <div class="alert management-notice">주담당자는 1명, 보조담당자는 여러 명 지정할 수 있습니다. 활성 직원만 표시합니다.</div>
          <div class="field"><label for="assign-primary">주담당자</label><select id="assign-primary" v-model="form.primary"><option v-for="employee in activeStaff" :key="employee.id">{{ employee.name }}</option></select></div>
        </template>
        <fieldset v-if="modal === '수임업체 등록' || modal === '담당자 지정'" class="staff-picker">
          <legend class="field-label">{{ modal === '수임업체 등록' ? '보조담당자 (복수 선택)' : '보조담당자' }}</legend>
          <input v-if="modal === '담당자 지정'" v-model="staffQuery" class="control" aria-label="직원 검색" placeholder="직원 검색">
          <div class="checkbox-list">
            <label v-for="employee in filteredActiveStaff" :key="employee.id">
              <input v-model="secondary" type="checkbox" :value="employee.name" :disabled="employee.name === form.primary">
              {{ employee.name }} · {{ employee.team }}
            </label>
          </div>
        </fieldset>
        <div v-for="[key, label, placeholder] in fields" :key="key" class="field">
          <label :for="'management-' + key">{{ label }}</label>
          <input :id="'management-' + key" v-model="form[key]" :placeholder="placeholder" :type="modal === '비밀번호 변경' ? 'password' : 'text'">
        </div>
        <template v-if="modal === '직원 초대'">
          <div class="alert management-notice">실제 이메일은 발송되지 않습니다. 초대 대기 상태의 Mock Data만 추가됩니다.</div>
          <div class="field"><label for="invite-email">초대 이메일 *</label><input id="invite-email" v-model="form.email" type="email" placeholder="name@company.com"></div>
          <div class="field"><label for="invite-team">부서/팀</label><select id="invite-team" v-model="form.team"><option v-for="value in teams" :key="value">{{ value }}</option></select></div>
          <div class="field"><label for="invite-title">직책</label><input id="invite-title" v-model="form.title" placeholder="세무대리"></div>
        </template>
        <p v-if="modal === '직원 권한 변경'">{{ selectedStaff?.name }} 님의 역할을 변경합니다.</p>
        <div v-if="modal === '직원 초대' || modal === '직원 권한 변경'" class="field">
          <label for="staff-role">시스템 역할</label><select id="staff-role" v-model="form.role"><option v-for="value in roles" :key="value">{{ value }}</option></select>
        </div>
        <div v-if="modal === '지점 추가' || modal === '사무소 수정'" class="field">
          <label for="branch-status">운영 상태</label><select id="branch-status" v-model="form.status"><option>활성</option><option>비활성</option></select>
        </div>
        <p v-if="modal === '비밀번호 변경'" class="muted-note">실제 비밀번호는 변경되지 않습니다.</p>
        <template v-if="modal === '2단계 인증 설정'">
          <p>실제 인증 연동 전 화면 예시입니다.</p>
          <div class="settings-row"><b>인증 앱으로 로그인 보호</b><span class="switch" aria-label="설정되지 않음"></span></div>
        </template>
        <template v-if="modal === '로그인 기기 및 세션'">
          <div class="settings-row"><div><b>Windows · Chrome</b><p>2026.11.17 09:12 · 현재 기기</p></div><ManagementBadge value="활성" /></div>
          <div class="settings-row"><div><b>iPhone · Safari</b><p>2026.11.15 18:30 · 다른 기기</p></div><button type="button" class="btn sm" @click="message = '세션 종료 UI만 시뮬레이션합니다.'">로그아웃</button></div>
        </template>
        <template v-if="modal === '다른 기기에서 로그아웃'">
          <p>현재 기기를 제외한 모든 기기의 세션을 종료하시겠습니까?</p><div class="alert">실제 세션 삭제는 수행되지 않습니다.</div>
        </template>
        <template v-if="modal === '직원 계정 비활성화'">
          <p><strong>{{ selectedStaff?.name }}</strong>님의 계정을 비활성화하시겠습니까?</p><div class="alert">실제 로그인 차단은 수행되지 않습니다.</div>
        </template>
        <div v-if="modal === '직원 권한 변경'" class="alert">권한 변경은 데모 상태에만 반영됩니다.</div>
        <p v-if="message" :role="modal === '로그인 기기 및 세션' ? 'status' : 'alert'" class="alert management-feedback">{{ message }}</p>
      </form>
      <template #footer>
        <button class="btn" @click="closeModal">취소</button>
        <button class="btn primary" form="management-form">확인</button>
      </template>
    </ManagementDialog>
    <p v-if="message && !modal && !editing" role="status" class="toast management-toast">{{ message }}</p>
  </div>
</template>
