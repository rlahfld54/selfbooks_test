<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import AuthTabs from './AuthTabs.vue'
import PasswordField from './PasswordField.vue'
import {
  VERIFY_LABEL,
  infoError,
  loginIdError,
  requiredTermsAgreed,
  validCode,
  type SignupInfo,
  type SignupTerms,
  type VerifyMethod,
} from './signup'

// 0 = 가입 안내(신규/기존), 1 약관동의, 2 본인인증, 3 회원정보, 4 가입완료
const step = ref(0)
const error = ref('')

// 1. 약관동의
const terms = reactive<SignupTerms>({ service: false, privacy: false, entrust: false, marketing: false })
const termsOpen = ref('')
const allAgreed = computed(() => terms.service && terms.privacy && terms.entrust && terms.marketing)

function toggleAll() {
  const value = !allAgreed.value
  terms.service = value
  terms.privacy = value
  terms.entrust = value
  terms.marketing = value
}

// 2. 본인인증 (데모: 실제 발송·조회 없음)
const method = ref<VerifyMethod | null>(null)
const verify = reactive({ name: '', birth: '', phone: '', email: '', ipinId: '', ipinPassword: '', code: '' })
const sent = ref(false)
const verified = ref(false)
const verifyMessage = ref('')

function chooseMethod(value: VerifyMethod | null) {
  method.value = value
  sent.value = false
  verified.value = false
  verifyMessage.value = ''
  verify.code = ''
  error.value = ''
}

function sendCode() {
  error.value = ''
  if (!verify.name.trim()) { error.value = '이름을 입력하세요.'; return }
  if (method.value === 'phone' && !/^\d{8}$/.test(verify.birth.trim())) { error.value = '생년월일 8자리를 입력하세요.'; return }
  if (method.value === 'email' && !verify.email.trim()) { error.value = '이메일을 입력하세요.'; return }
  if (method.value !== 'email' && !verify.phone.trim()) { error.value = '휴대폰 번호를 입력하세요.'; return }
  sent.value = true
  verified.value = false
  verifyMessage.value = '인증번호를 보냈습니다. 유효시간 3분 (데모: 숫자 6자리 아무거나 입력)'
}

function checkCode() {
  error.value = ''
  if (!validCode(verify.code)) { error.value = '인증번호 6자리를 입력하세요.'; return }
  verified.value = true
  verifyMessage.value = '본인 인증이 완료되었습니다.'
}

function checkIpin() {
  error.value = ''
  if (!verify.name.trim() || !verify.ipinId.trim() || !verify.ipinPassword) { error.value = '이름, 아이핀 아이디, 비밀번호를 입력하세요.'; return }
  verify.ipinPassword = ''
  verified.value = true
  verifyMessage.value = '본인 인증이 완료되었습니다.'
}

// 데모: 인증했다고 치고 다음 단계로
function skipVerify() {
  error.value = ''
  if (!verify.name.trim()) { error.value = '이름을 입력하세요.'; return }
  verified.value = true
  next()
}

// 3. 회원정보
const info = reactive<SignupInfo>({ loginId: '', password: '', confirmation: '', phone: '', email: '' })
const idChecked = ref(false)
const idMessage = ref('')
const phoneLocked = computed(() => (method.value === 'phone' || method.value === 'sms') && !!verify.phone.trim())
const emailLocked = computed(() => method.value === 'email' && !!verify.email.trim())

function checkId() {
  idMessage.value = loginIdError(info.loginId)
  idChecked.value = !idMessage.value
  if (idChecked.value) idMessage.value = '사용할 수 있는 아이디입니다. (데모: 서버 확인 없음)'
}

function idChanged() {
  idChecked.value = false
  idMessage.value = ''
}

// 단계 이동
function next() {
  error.value = ''
  if (step.value === 1 && !requiredTermsAgreed(terms)) { error.value = '필수 약관에 동의해 주세요.'; return }
  if (step.value === 2) {
    if (!method.value) { error.value = '인증 방법을 선택하세요.'; return }
    if (!verify.name.trim()) { error.value = '이름을 입력하세요.'; return }
    if (!verified.value) { error.value = '본인 인증을 완료하세요.'; return }
    if (phoneLocked.value) info.phone = verify.phone.trim()
    if (emailLocked.value) info.email = verify.email.trim()
  }
  if (step.value === 3) {
    error.value = infoError(info, idChecked.value)
    if (error.value) return
    info.password = ''
    info.confirmation = ''
  }
  step.value++
}

function prev() {
  error.value = ''
  step.value--
}

function startSignup() {
  error.value = ''
  step.value = 1
}
</script>

<template>
  <AuthTabs active="register" />

  <!-- 가입 안내 -->
  <template v-if="step === 0">
    <div class="auth-form-heading"><span class="section-kicker">JOIN SELFBOOKS</span><h1>셀프북스에<br />가입해주세요.</h1></div>
    <div class="su-gate">
      <div class="su-gate-card">
        <h2>신규회원가입</h2>
        <p>신규회원으로 가입합니다.</p>
        <button class="entry-button primary full" type="button" @click="startSignup">회원가입<UiIcon name="arrow" :size="17" /></button>
      </div>
      <div class="su-gate-card">
        <h2>셀프북스 기존회원</h2>
        <p>셀프북스에 이미 계정이 있는 경우<br />로그인 후 사무소를 연결해주세요.</p>
        <NuxtLink class="entry-button secondary full" to="/login">로그인</NuxtLink>
      </div>
    </div>
  </template>

  <template v-else>
    <div class="auth-form-heading su-heading"><span class="section-kicker">SIGN UP</span><h1>셀프북스 회원가입</h1></div>

    <ol class="su-steps">
      <li :class="{ done: step > 1, current: step === 1 }"><span>{{ step > 1 ? '✓' : '1' }}</span>약관동의</li>
      <li :class="{ done: step > 2, current: step === 2 }"><span>{{ step > 2 ? '✓' : '2' }}</span>본인인증</li>
      <li :class="{ done: step > 3, current: step === 3 }"><span>{{ step > 3 ? '✓' : '3' }}</span>회원정보</li>
      <li :class="{ done: step > 4, current: step === 4 }"><span>4</span>가입완료</li>
    </ol>

    <!-- 1. 약관동의 -->
    <div v-if="step === 1" class="entry-form">
      <div>
        <h2 class="su-title">약관 동의</h2>
        <p class="su-sub">서비스 이용을 위해 아래 약관에 동의해 주세요.</p>
      </div>
      <label class="su-all"><input type="checkbox" :checked="allAgreed" @change="toggleAll" />전체 동의</label>
      <div class="su-terms">
        <div class="su-term">
          <label><input v-model="terms.service" type="checkbox" />서비스 이용약관 <b class="su-req">(필수)</b></label>
          <button type="button" @click="termsOpen = '서비스 이용약관'">전문 보기</button>
        </div>
        <div class="su-term">
          <label><input v-model="terms.privacy" type="checkbox" />개인정보 수집 및 이용 동의 <b class="su-req">(필수)</b></label>
          <button type="button" @click="termsOpen = '개인정보 수집 및 이용 동의'">전문 보기</button>
        </div>
        <div class="su-term">
          <label><input v-model="terms.entrust" type="checkbox" />개인정보 처리 위탁 동의 <b class="su-req">(필수)</b></label>
          <button type="button" @click="termsOpen = '개인정보 처리 위탁 동의'">전문 보기</button>
        </div>
        <div class="su-term">
          <label><input v-model="terms.marketing" type="checkbox" />마케팅 정보 수신 동의 <span class="su-opt">(선택)</span></label>
          <button type="button" @click="termsOpen = '마케팅 정보 수신 동의'">전문 보기</button>
        </div>
      </div>
      <p v-if="error" class="entry-error" role="alert">{{ error }}</p>
      <div class="su-foot">
        <button class="entry-button secondary" type="button" @click="step = 0">이전</button>
        <button class="entry-button primary" type="button" :disabled="!requiredTermsAgreed(terms)" @click="next">다음</button>
      </div>
    </div>

    <!-- 2. 본인인증: 방법 선택 -->
    <div v-else-if="step === 2 && !method" class="entry-form">
      <div>
        <h2 class="su-title">본인 인증</h2>
        <p class="su-sub">개인정보 보호를 위해 본인 확인이 필요합니다.<br />원하시는 인증 방식을 선택해 주세요.</p>
      </div>
      <div class="su-methods">
        <button class="su-method" type="button" @click="chooseMethod('phone')"><b>본인명의 휴대전화 인증</b><span>휴대폰 번호로 인증번호를 받습니다.</span></button>
        <button class="su-method" type="button" @click="chooseMethod('ipin')"><b>아이핀(I-Pin) 인증</b><span>아이핀 아이디로 인증합니다.</span></button>
      </div>
      <div class="su-help">
        <b>본인인증이 어려우신가요?</b>
        <ul>
          <li>본인 명의의 휴대전화나 아이핀이 없는 경우</li>
          <li>법인 명의의 휴대전화를 사용하는 경우</li>
          <li>해외에 거주하는 내국인/외국인 경우</li>
        </ul>
        <div class="su-alt">
          <button class="entry-button secondary" type="button" @click="chooseMethod('sms')">문자 인증</button>
          <button class="entry-button secondary" type="button" @click="chooseMethod('email')">이메일 인증</button>
        </div>
      </div>
      <p class="su-note">문자·이메일 인증으로 가입한 경우, 가입 후 개인설정 메뉴에서 본인인증을 추가로 진행할 수 있습니다.</p>
      <p v-if="error" class="entry-error" role="alert">{{ error }}</p>
      <div class="su-foot">
        <button class="entry-button secondary" type="button" @click="prev">이전</button>
        <button class="entry-button primary" type="button" @click="next">다음</button>
      </div>
    </div>

    <!-- 2. 본인인증: 입력 -->
    <div v-else-if="step === 2" class="entry-form">
      <div>
        <h2 class="su-title">{{ VERIFY_LABEL[method!] }}</h2>
        <button class="su-back" type="button" @click="chooseMethod(null)">← 인증 방법 다시 선택</button>
      </div>
      <div><label class="entry-field" for="su-name">이름</label><input id="su-name" v-model="verify.name" maxlength="60" autocomplete="name" /></div>
      <div v-if="method === 'phone'"><label class="entry-field" for="su-birth">생년월일</label><input id="su-birth" v-model="verify.birth" maxlength="8" inputmode="numeric" placeholder="YYYYMMDD" /></div>

      <template v-if="method === 'ipin'">
        <div><label class="entry-field" for="su-ipin-id">아이핀 아이디</label><input id="su-ipin-id" v-model="verify.ipinId" autocomplete="off" maxlength="40" /></div>
        <div><label class="entry-field" for="su-ipin-pw">아이핀 비밀번호</label><input id="su-ipin-pw" v-model="verify.ipinPassword" type="password" autocomplete="off" maxlength="40" /></div>
        <button class="entry-button secondary full" type="button" @click="checkIpin">인증하기</button>
        <small class="entry-hint" :class="{ matched: verified }">{{ verifyMessage || '아이핀이 없으면 발급기관에서 먼저 발급받아야 합니다.' }}</small>
      </template>

      <template v-else>
        <div v-if="method === 'email'">
          <label class="entry-field" for="su-verify-email">이메일</label>
          <div class="su-row"><input id="su-verify-email" v-model="verify.email" type="email" maxlength="254" placeholder="name@example.com" /><button class="entry-button secondary" type="button" @click="sendCode">인증번호 받기</button></div>
        </div>
        <div v-else>
          <label class="entry-field" for="su-verify-phone">휴대폰 번호</label>
          <div class="su-row"><input id="su-verify-phone" v-model="verify.phone" type="tel" maxlength="13" placeholder="010-0000-0000" /><button class="entry-button secondary" type="button" @click="sendCode">인증번호 받기</button></div>
        </div>
        <div v-if="sent">
          <label class="entry-field" for="su-code">인증번호</label>
          <div class="su-row"><input id="su-code" v-model="verify.code" maxlength="6" inputmode="numeric" placeholder="6자리 입력" /><button class="entry-button secondary" type="button" @click="checkCode">확인</button></div>
          <small class="entry-hint" :class="{ matched: verified }">{{ verifyMessage }}</small>
        </div>
      </template>

      <p v-if="error" class="entry-error" role="alert">{{ error }}</p>
      <button class="su-skip" type="button" @click="skipVerify">데모: 인증 완료로 처리하고 넘어가기</button>
      <div class="su-foot">
        <button class="entry-button secondary" type="button" @click="prev">이전</button>
        <button class="entry-button primary" type="button" @click="next">다음</button>
      </div>
    </div>

    <!-- 3. 회원정보 -->
    <form v-else-if="step === 3" class="entry-form" @submit.prevent="next">
      <div>
        <h2 class="su-title">회원정보 입력</h2>
        <p class="su-sub">회원님의 정보를 입력해 주세요.</p>
      </div>
      <div>
        <label class="entry-field" for="su-id">아이디</label>
        <div class="su-row"><input id="su-id" v-model="info.loginId" autocomplete="username" maxlength="20" placeholder="영문·숫자 5~20자" @input="idChanged" /><button class="entry-button secondary" type="button" @click="checkId">중복확인</button></div>
        <small class="entry-hint" :class="idChecked ? 'matched' : (idMessage ? 'unmatched' : '')">{{ idMessage || '가입 후에는 아이디를 변경할 수 없으니 신중히 입력해 주세요.' }}</small>
      </div>
      <div><PasswordField id="su-password" v-model="info.password" label="비밀번호" autocomplete="new-password" /><small class="entry-hint">영문과 숫자를 포함해 8자 이상 입력하세요.</small></div>
      <div><PasswordField id="su-confirmation" v-model="info.confirmation" label="비밀번호 확인" autocomplete="new-password" /><small v-if="info.confirmation" class="entry-hint" :class="info.password === info.confirmation ? 'matched' : 'unmatched'">{{ info.password === info.confirmation ? '비밀번호가 일치합니다.' : '비밀번호가 일치하지 않습니다.' }}</small></div>
      <div><label class="entry-field" for="su-user-name">사용자 이름</label><input id="su-user-name" :value="verify.name" readonly /><small class="entry-hint">본인 인증한 이름으로 가입됩니다.</small></div>
      <div><label class="entry-field" for="su-phone">휴대전화번호</label><input id="su-phone" v-model="info.phone" type="tel" maxlength="13" placeholder="010-0000-0000" :readonly="phoneLocked" /><small class="entry-hint">등록된 인증정보로 아이디·비밀번호를 찾을 수 있으며, 알림을 받습니다.</small></div>
      <div><label class="entry-field" for="su-email">이메일 주소</label><input id="su-email" v-model="info.email" type="email" maxlength="254" placeholder="이메일 주소를 입력해 주세요" :readonly="emailLocked" /><small class="entry-hint">본인 확인이 필요한 경우 사용할 이메일 주소이므로 반드시 입력하셔야 합니다.</small></div>
      <p v-if="error" class="entry-error" role="alert">{{ error }}</p>
      <div class="su-foot">
        <button class="entry-button secondary" type="button" @click="prev">이전</button>
        <button class="entry-button primary" type="submit">다음</button>
      </div>
    </form>

    <!-- 4. 가입완료 -->
    <div v-else class="entry-form">
      <div class="su-done">
        <span class="su-done-mark">✓</span>
        <h2 class="su-title">회원가입이 완료되었습니다</h2>
        <p class="su-sub">로그인하면 사무소를 신청하거나, 사무소의 초대를 받아 소속될 수 있습니다.</p>
      </div>
      <dl class="su-summary">
        <dt>이름</dt><dd>{{ verify.name || '-' }}</dd>
        <dt>아이디</dt><dd>{{ info.loginId || '-' }}</dd>
        <dt>이메일</dt><dd>{{ info.email || '-' }}</dd>
      </dl>
      <p class="su-note">- 세무사무소를 새로 시작하려면 로그인 후 「사무소 가입 신청」에서 사무소 정보를 입력하고 결제하면 됩니다.<br />- 이미 사무소에 소속되어 있다면 사무소 관리자의 초대를 받아 소속됩니다.</p>
      <NuxtLink class="entry-button primary full" to="/login">로그인 화면으로</NuxtLink>
    </div>
  </template>

  <p v-if="step < 4" class="auth-switch">이미 계정이 있으신가요? <NuxtLink to="/login">로그인</NuxtLink></p>

  <UiModal :open="!!termsOpen" :title="termsOpen" @close="termsOpen = ''">
    <p>약관 내용은 준비 중입니다.</p>
    <template #footer><UiButton variant="primary" @click="termsOpen = ''">확인</UiButton></template>
  </UiModal>
</template>
