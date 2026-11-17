<script setup lang="ts">
import { useWorkspaceContext } from '~/composables/useWorkspaceContext'
import ClientDirectory from '~/features/client-directory/ClientDirectory.vue'
import { managementSession } from './session'
import { filterClients, assignedPeople } from './management'
import { roles } from './data'
import type { Client, Staff } from './data'

const props = defineProps<{ page: 'mypage' | 'organization' | 'clients' }>()
const { state, navigate, activeTab, setDirty } = useWorkspaceContext()
const data = managementSession(state)
const tab = ref(props.page === 'mypage' ? 'info' : 'basic')
const live = ref(false)
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
const tabs = computed(() => props.page === 'mypage'
  ? [['info', '내 정보'], ['organization', '소속 조직'], ['security', '보안 설정']]
  : [['basic', '조직 기본정보'], ['staff', '직원 관리'], ['permissions', '권한 관리'], ['branches', '본사/지점 관리']])
const clients = computed(() => filterClients(data.clients, query.value, biz.value, kind.value, status.value, person.value, review.value))
const staff = computed(() => data.staff.filter(row => (row.name + row.login + row.email).toLowerCase().includes(query.value.trim().toLowerCase())
  && (!team.value || row.team === team.value) && (!role.value || row.role === role.value) && (!status.value || row.status === status.value)))
const activeStaff = computed(() => data.staff.filter(row => row.status === '활성'))
const permissionRows = ['조직 정보 수정', '직원 초대 및 관리', '수임업체 등록', '수임업체 정보 수정', '담당 수임업체 조회', '전표 조회 및 입력', '마감 처리', '신고 관련 업무']
const orgSections = [ ['사업자 정보', ['회계법인명/사무소명', '사업자등록번호', '법인등록번호', '대표자명', '사업장 주소', '업태', '종목']], ['연락처 정보', ['대표전화', '대표 이메일', '팩스번호']], ['세무대리 관련 정보', ['세무대리인 관리번호', '사무소 구분', '기타 등록정보']] ] as const
const fields = computed(() => {
  if (modal.value === '수임업체 등록') return [['name','업체명'],['biz','사업자등록번호'],['ceo','대표자명'],['start','수임 시작일']]
  if (modal.value === '직원 초대') return [['email','초대 이메일'],['title','직책']]
  if (modal.value.includes('지점') || modal.value === '사무소 수정') return [['name','지점명'],['address','사업장 주소'],['phone','대표 연락처']]
  if (modal.value === '비밀번호 변경') return [['old','현재 비밀번호'],['new','새 비밀번호'],['confirm','비밀번호 확인']]
  return []
})
function resetFilters() { query.value = ''; biz.value = ''; kind.value = ''; status.value = ''; person.value = ''; review.value = ''; team.value = ''; role.value = '' }
function open(title: string) {
  Object.keys(form).forEach(key => delete form[key])
  Object.assign(form, { type: '개인', primary: selectedClient.value?.primary || activeStaff.value[0]?.name || '', team: '세무1팀', role: selectedStaff.value?.role || roles[1], status: '활성', start: '2026-11-17' })
  secondary.value = [...(selectedClient.value?.secondary || [])]
  staffQuery.value = ''; message.value = ''; modal.value = title
}
function closeModal() { modal.value = ''; message.value = ''; Object.keys(form).forEach(key => delete form[key]) }
function beginEdit() {
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
    message.value = '변경사항을 화면에 저장했습니다. 새로고침하면 초기화됩니다.'
  }
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
      closeModal(); message.value = '보안 기능은 화면 시뮬레이션입니다. 실제 계정에는 적용되지 않습니다.'; return
    }
    modal.value = ''; message.value = '화면 데이터에 반영했습니다. 새로고침하면 초기화됩니다.'
  } catch (error) { message.value = error instanceof Error ? error.message : '입력값을 확인해 주세요.' }
}
function editBranch(id: string) { branchId.value = id; open('사무소 수정'); Object.assign(form, data.branches.find(row => row.id === id)) }
async function go(id: 'company' | 'settings' | 'accounts' | 'voucher' | 'organization') { await navigate(id) }
onBeforeUnmount(() => { if (editing.value) setDirty(currentTab, false) })
</script>

<template>
  <div class="management">
    <PageToolbar :title="titles[page]" description="개인 계정, 조직 구성원 및 수임업체를 관리합니다.">
      <UiBadge tone="neutral">관리 화면 시안 · 새로고침 시 초기화</UiBadge>
      <UiButton v-if="page === 'clients'" variant="primary" @click="open('수임업체 등록')">수임업체 등록</UiButton>
    </PageToolbar>
    <p v-if="message && !modal" role="status">{{ message }}</p>
    <div v-if="page === 'clients'" class="management-actions">
      <UiButton :variant="live ? 'secondary' : 'primary'" @click="live = false">수임업체 관리 시안</UiButton>
      <UiButton :variant="live ? 'primary' : 'secondary'" @click="live = true">등록된 수임업체 조회</UiButton>
    </div>
    <ClientDirectory v-if="page === 'clients' && live" />
    <template v-else-if="page === 'clients'">
      <div class="management-stats">
        <UiCard v-for="item in [['전체 수임업체', data.clients.length], ['수임 중인 업체', data.clients.filter(c => c.status === '수임 중').length], ['등록정보 검토 대기', data.clients.filter(c => c.company !== '검토 완료' || c.environment !== '검토 완료').length], ['수임 종료 업체', data.clients.filter(c => c.status === '수임 종료').length]]" :key="String(item[0])" :title="String(item[0])">
<strong>{{ item[1] }}개 업체</strong>
</UiCard>
      </div>
      <UiCard title="수임업체 목록">
        <div class="management-actions">
          <UiInput v-model="query" aria-label="업체명 검색" placeholder="업체명 검색" />
<UiInput v-model="biz" aria-label="사업자번호 검색" placeholder="사업자번호 검색" />
          <select v-model="kind" class="input" aria-label="개인/법인">
<option value="">개인/법인</option>
<option>개인</option>
<option>법인</option>
</select>
          <select v-model="status" class="input" aria-label="수임 상태">
<option value="">전체 수임 상태</option>
<option>수임 중</option>
<option>수임 종료</option>
<option>등록 대기</option>
</select>
          <select v-model="person" class="input" aria-label="담당 직원">
<option value="">전체 담당 직원</option>
<option v-for="s in data.staff" :key="s.id">{{ s.name }}</option>
</select>
          <select v-model="review" class="input" aria-label="검토 상태">
<option value="">전체 검토 상태</option>
<option>검토 전</option>
<option>검토 중</option>
<option>검토 완료</option>
</select>
          <UiButton @click="resetFilters">초기화</UiButton>
        </div>
        <p>전체 {{ clients.length }}개 업체 표시</p>
        <div class="management-table">
<table>
<caption class="sr-only">수임업체 관리 시안</caption>
<thead>
<tr>
<th v-for="label in ['업체명','사업자등록번호','구분','대표자명','주담당자','보조담당자','수임 상태','회사정보','환경설정','관리']" :key="label">{{ label }}</th>
</tr>
</thead>
          <tbody>
<tr v-for="c in clients" :key="c.id">
<td>
<strong>{{ c.name }}</strong>
<br>{{ c.id }}</td>
<td>{{ c.biz }}</td>
<td>{{ c.type }}</td>
<td>{{ c.ceo }}</td>
<td>{{ c.primary }}</td>
<td>{{ c.secondary.join(', ') || '—' }}</td>
<td>{{ c.status }}</td>
<td>{{ c.company }}</td>
<td>{{ c.environment }}</td>
<td>
<UiButton size="small" @click="selectedClient = c">상세 보기</UiButton>
</td>
</tr>
<tr v-if="!clients.length">
<td colspan="10">검색 조건에 맞는 수임업체가 없습니다.</td>
</tr>
</tbody>
</table>
</div>
      </UiCard>
    </template>
    <template v-else>
      <UiCard :title="page === 'mypage' ? me.name : data.organization['회계법인명/사무소명']">
        <div class="management-actions" v-if="page === 'mypage'">
<span>{{ me.title }} · {{ me.login }} · {{ me.email }} · {{ me.team }}</span>
<UiBadge>{{ me.role }}</UiBadge>
<UiBadge>{{ me.status }}</UiBadge>
</div>
        <div class="management-actions" v-else>
<span>사업자등록번호 {{ data.organization['사업자등록번호'] }} · 대표 {{ data.organization['대표자명'] }}</span>
<span>소속 직원 {{ data.staff.length }}명 · 수임업체 {{ data.clients.length }}개</span>
</div>
      </UiCard>
      <div class="management-actions" role="tablist" :aria-label="titles[page]">
<UiButton v-for="item in tabs" :key="item[0]" role="tab" :aria-selected="tab === item[0]" :variant="tab === item[0] ? 'primary' : 'secondary'" @click="changeTab(item[0]!)">{{ item[1] }}</UiButton>
</div>
      <UiCard v-if="page === 'mypage' && tab === 'info'" title="기본 정보">
        <div class="management-fields">
<label v-for="field in [['id','사용자 ID'],['login','로그인 ID'],['name','이름'],['email','이메일'],['phone','휴대전화'],['team','부서/팀'],['title','직책'],['role','시스템 권한']]" :key="field[0]">{{ field[1] }}<UiInput v-if="editing && ['name','email','phone'].includes(field[0]!)" v-model="form[field[0]!]" />
<span v-else>{{ me[field[0] as keyof Staff] || '—' }}</span>
</label>
<label>소속 조직<span>{{ data.organization['회계법인명/사무소명'] }}</span>
</label>
</div>
        <div class="management-actions">
<UiButton v-if="!editing" @click="beginEdit">정보 수정</UiButton>
<template v-else>
<UiButton @click="endEdit(false)">취소</UiButton>
<UiButton variant="primary" @click="endEdit(true)">변경사항 저장</UiButton>
</template>
</div>
      </UiCard>
      <UiCard v-else-if="page === 'mypage' && tab === 'organization'" title="소속 조직 정보">
<dl class="management-fields">
<div v-for="(value, key) in data.organization" :key="key">
<dt>{{ key }}</dt>
<dd>{{ value }}</dd>
</div>
</dl>
<UiButton @click="go('organization')">조직 설정으로 이동</UiButton>
</UiCard>
      <UiCard v-else-if="page === 'mypage' && tab === 'security'" title="계정 보안">
<p>보안 설정 및 로그인 기록은 화면 예시입니다.</p>
<div class="management-row" v-for="item in [['비밀번호 변경','마지막 변경 2026.09.12'],['2단계 인증 설정','현재 설정되지 않음'],['로그인 기기 및 세션','최근 로그인 2026.11.17 09:12 · Windows / Chrome'],['다른 기기에서 로그아웃','현재 기기를 제외한 모든 기기']]" :key="item[0]">
<div>
<strong>{{ item[0] }}</strong>
<p>{{ item[1] }}</p>
</div>
<UiButton @click="open(item[0]!)">{{ item[0] }}</UiButton>
</div>
</UiCard>
      <template v-else-if="tab === 'basic'">
        <UiCard v-for="section in orgSections" :key="section[0]" :title="section[0]">
<div class="management-fields">
<label v-for="key in section[1]" :key="key">{{ key }}<UiInput v-if="editing" v-model="form[key]" />
<span v-else>{{ data.organization[key] }}</span>
</label>
</div>
</UiCard>
        <div class="management-actions">
<UiButton v-if="!editing" @click="beginEdit">수정하기</UiButton>
<template v-else>
<UiButton @click="endEdit(false)">취소</UiButton>
<UiButton variant="primary" @click="endEdit(true)">변경사항 저장</UiButton>
</template>
</div>
      </template>
      <UiCard v-else-if="tab === 'staff'" title="직원 관리">
<template #actions>
<UiButton variant="primary" @click="open('직원 초대')">직원 초대</UiButton>
</template>
<div class="management-actions">
<UiInput v-model="query" aria-label="직원 검색" placeholder="이름, ID, 이메일 검색" />
<select v-model="team" class="input" aria-label="부서">
<option value="">전체 부서</option>
<option>세무1팀</option>
<option>세무2팀</option>
<option>관리팀</option>
</select>
<select v-model="role" class="input" aria-label="권한">
<option value="">전체 권한</option>
<option v-for="r in roles" :key="r">{{ r }}</option>
</select>
<select v-model="status" class="input" aria-label="계정 상태">
<option value="">전체 상태</option>
<option>활성</option>
<option>초대 대기</option>
<option>비활성</option>
</select>
</div>
<p>{{ staff.length }}명 표시</p>
<div class="management-table">
<table>
<thead>
<tr>
<th v-for="label in ['이름','로그인 ID','이메일','부서/팀','직책','시스템 권한','계정 상태','가입일','관리']" :key="label">{{ label }}</th>
</tr>
</thead>
<tbody>
<tr v-for="s in staff" :key="s.id">
<td>{{ s.name }}</td>
<td>{{ s.login }}</td>
<td>{{ s.email }}</td>
<td>{{ s.team }}</td>
<td>{{ s.title }}</td>
<td>{{ s.role }}</td>
<td>{{ s.status }}</td>
<td>{{ s.joined }}</td>
<td>
<UiButton size="small" @click="selectedStaff = s">상세 보기</UiButton>
</td>
</tr>
<tr v-if="!staff.length">
<td colspan="9">검색 조건에 해당하는 직원이 없습니다.</td>
</tr>
</tbody>
</table>
</div>
</UiCard>
      <UiCard v-else-if="tab === 'permissions'" title="역할별 권한 매트릭스">
<p>정책 확정 전 · 화면 검증용 가상 권한 구성입니다.</p>
<div class="management-table">
<table>
<thead>
<tr>
<th>업무 기능</th>
<th>조직 관리자</th>
<th>일반 사용자</th>
</tr>
</thead>
<tbody>
<tr v-for="(label, index) in permissionRows" :key="label">
<td>{{ label }}</td>
<td>✓</td>
<td>{{ [0,1,6].includes(index) ? '—' : '✓' }}</td>
</tr>
</tbody>
</table>
</div>
</UiCard>
      <UiCard v-else-if="tab === 'branches'" title="본사 및 지점">
<template #actions>
<UiButton variant="primary" @click="branchId = ''; open('지점 추가')">지점 추가</UiButton>
</template>
<div class="management-fields">
<section v-for="branch in data.branches" :key="branch.id">
<h3>{{ branch.name }} · {{ branch.kind }}</h3>
<p>{{ branch.address }}</p>
<p>{{ branch.phone }} · {{ branch.status }}</p>
<p>소속 직원 {{ branch.count }}명</p>
<UiButton @click="editBranch(branch.id)">정보 수정</UiButton>
</section>
</div>
</UiCard>
    </template>
    <UiModal :open="Boolean(selectedClient) && !modal" placement="right" :title="selectedClient?.name || '수임업체 상세'" size="large" @close="selectedClient = undefined">
      <template v-if="selectedClient">
<h3>기본 정보</h3>
<dl class="management-fields">
<div v-for="field in [['biz','사업자등록번호'],['type','개인/법인'],['ceo','대표자명'],['address','주소'],['status','수임 상태'],['start','수임 시작일'],['end','수임 종료일']]" :key="field[0]">
<dt>{{ field[1] }}</dt>
<dd>{{ selectedClient[field[0] as keyof Client] || '—' }}</dd>
</div>
</dl>
<h3>담당자 정보</h3>
<p>주담당자 {{ selectedClient.primary }} · 보조담당자 {{ selectedClient.secondary.join(', ') || '—' }}</p>
<UiButton @click="open('담당자 지정')">담당자 지정</UiButton>
<h3>등록정보 검토 상태</h3>
<div v-for="field in [['company','회사정보'],['environment','환경설정'],['chart','계정과목']]" :key="field[0]" class="management-row">
<span>{{ field[1] }}</span>
<span>{{ selectedClient[field[0] as keyof Client] }}</span>
</div>
<p>아래 업무 화면은 현재 작업 공간의 회사로 열립니다.</p>
<div class="management-actions">
<UiButton @click="go('company')">회사등록</UiButton>
<UiButton @click="go('settings')">환경등록</UiButton>
<UiButton @click="go('accounts')">계정과목</UiButton>
<UiButton @click="go('voucher')">일반전표입력</UiButton>
</div>
</template>
    </UiModal>
    <UiModal :open="Boolean(selectedStaff) && !modal" placement="right" :title="selectedStaff?.name || '직원 상세'" @close="selectedStaff = undefined">
<template v-if="selectedStaff">
<dl class="management-fields">
<div v-for="field in [['login','로그인 ID'],['email','이메일'],['team','부서/팀'],['title','직책'],['role','시스템 권한'],['status','계정 상태'],['joined','가입일']]" :key="field[0]">
<dt>{{ field[1] }}</dt>
<dd>{{ selectedStaff[field[0] as keyof Staff] }}</dd>
</div>
</dl>
<h3>담당 수임업체</h3>
<p v-for="c in data.clients.filter(c => c.primary === selectedStaff?.name || c.secondary.includes(selectedStaff?.name || ''))" :key="c.id">{{ c.name }} · {{ c.primary === selectedStaff.name ? '주담당' : '보조담당' }}</p>
<div class="management-actions">
<UiButton @click="open('직원 권한 변경')">권한 변경</UiButton>
<UiButton variant="danger" @click="open('직원 계정 비활성화')">계정 비활성화</UiButton>
</div>
</template>
</UiModal>
    <UiModal :open="Boolean(modal)" :title="modal" @close="closeModal">
<p>화면 시안입니다. 초대 메일, 실제 권한 및 보안 설정은 연동 전입니다.</p>
<p v-if="message" role="alert">{{ message }}</p>
<form id="management-form" @submit.prevent="save">
<div class="management-fields">
<label v-for="field in fields" :key="field[0]">{{ field[1] }}<UiInput v-model="form[field[0]!]" :type="modal === '비밀번호 변경' ? 'password' : field[0] === 'start' ? 'date' : field[0] === 'email' ? 'email' : 'text'" />
</label>
</div>
      <label v-if="modal === '수임업체 등록'">개인/법인<select v-model="form.type" class="input">
<option>개인</option>
<option>법인</option>
</select>
</label>
      <template v-if="['수임업체 등록','담당자 지정'].includes(modal)">
<label>주담당자<select v-model="form.primary" class="input">
<option v-for="s in activeStaff" :key="s.id">{{ s.name }}</option>
</select>
</label>
<h3>보조담당자</h3>
<UiInput v-model="staffQuery" aria-label="담당 직원 검색" placeholder="직원 검색" />
<div class="management-fields">
<label v-for="s in activeStaff.filter(s => (s.name + s.team).includes(staffQuery))" :key="s.id">
<span>
<input v-model="secondary" type="checkbox" :value="s.name" :disabled="s.name === form.primary"> {{ s.name }} · {{ s.team }}</span>
</label>
</div>
</template>
      <label v-if="modal === '직원 초대'">부서/팀<select v-model="form.team" class="input">
<option>세무1팀</option>
<option>세무2팀</option>
<option>관리팀</option>
</select>
</label>
      <label v-if="['직원 초대','직원 권한 변경'].includes(modal)">시스템 역할<select v-model="form.role" class="input">
<option v-for="r in roles" :key="r">{{ r }}</option>
</select>
</label>
      <label v-if="['지점 추가','사무소 수정'].includes(modal)">운영 상태<select v-model="form.status" class="input">
<option>활성</option>
<option>비활성</option>
</select>
</label>
      <p v-if="modal === '직원 계정 비활성화'">{{ selectedStaff?.name }}님의 계정을 시안에서 비활성화하시겠습니까?</p>
      <p v-if="modal === '2단계 인증 설정'">인증 앱으로 로그인 보호 · 설정되지 않음</p>
      <template v-if="modal === '로그인 기기 및 세션'">
<p>Windows · Chrome · 현재 기기 · 2026.11.17 09:12</p>
<p>iPhone · Safari · 다른 기기 · 2026.11.15 18:30</p>
<UiButton @click="message = '세션 종료 화면 시뮬레이션입니다.'">다른 기기 로그아웃</UiButton>
</template>
      <p v-if="modal === '다른 기기에서 로그아웃'">현재 기기를 제외한 모든 기기의 세션 종료를 시뮬레이션하시겠습니까?</p>
    </form>
<template #footer>
<UiButton @click="closeModal">취소</UiButton>
<UiButton variant="primary" type="submit" form="management-form">확인</UiButton>
</template>
</UiModal>
  </div>
</template>

<style scoped>
.management { display: grid; gap: var(--aat-space-4); }
.management-actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--aat-space-2); padding-block: var(--aat-space-3); }
.management-actions > .input { width: auto; flex: 1 1 140px; }
.management-stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--aat-space-3); }
.management-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--aat-space-4); padding: var(--aat-space-4); }
.management-fields label { display: grid; gap: var(--aat-space-2); }
.management-fields dd { margin: var(--aat-space-2) 0; overflow-wrap: anywhere; }
.management-row { display: flex; align-items: center; justify-content: space-between; gap: var(--aat-space-3); padding: var(--aat-space-3); }
.management-table { overflow-x: auto; }
.management-table table { width: 100%; border-collapse: collapse; white-space: nowrap; }
.management-table th, .management-table td { text-align: left; padding: var(--aat-space-3); border-bottom: 1px solid var(--aat-color-border); }
.management-table th { background: var(--aat-color-subtle); }
@media (max-width: 760px) { .management-stats, .management-fields { grid-template-columns: 1fr; } }
</style>



