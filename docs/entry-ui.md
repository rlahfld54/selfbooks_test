# 서비스 최초 화면·Mock 로그인·회원가입

2026-11-10. 기존 Nuxt 4.6.4 / Vue 3 / TypeScript 프로젝트에 추가한 로컬 UI 프로토타입이다. 서버 인증·회원 DB·메일 발송은 구현하지 않았다.

## 실행과 경로

`frontend` 디렉터리에서 `npm run dev`를 실행하고 콘솔에 표시된 Local 주소에 접속한다.

| 경로 | 화면 / 레이아웃 |
| --- | --- |
| `/` | 서비스 랜딩 / `public` |
| `/login` | Mock 로그인 / `auth` |
| `/register` | Mock 회원가입 / `auth` |
| `/forgot-password` | 비밀번호 찾기 데모 / `auth` |
| `/dashboard` | 기존 홈 대시보드 / 기존 `default` |

기존 `/` 대시보드의 페이지 내용을 `dashboard.vue`에 그대로 보존했다. 홈 탭 ID `home`은 바꾸지 않았으며 경로 카탈로그에서 해당 경로만 변경했다. 회사별 탭 복원은 경로 문자열이 아닌 탭 ID를 저장하므로 기존 스냅샷을 유지한다. 나머지 업무 경로와 메뉴는 동일하다. 실제 접근 제어를 추가하지 않았으므로 `/dashboard`와 기존 업무 경로는 직접 열 수 있다.

테스트 계정: `admin@accountingpro.test` / `Test1234!`. 로그인 폼의 **테스트 계정 입력** 버튼으로 채울 수 있다.

## 화면과 동작

- 랜딩: sticky 헤더, 기능/서비스/이용 안내 앵커, 주요 CTA, CSS·SVG로 구성한 제품 미리보기, 기능 6개, 사용 흐름 3단계, 하단 CTA, 데모 정책 안내 모달.
- 로그인: 이메일·비밀번호, 표시/숨기기, 유지 체크, 실패 안내, 테스트 계정, 회원가입/비밀번호 찾기 연결.
- 회원가입: 이름·이메일·비밀번호·확인·필수 데모 동의, 비밀번호 규칙, 중복 이메일·불일치 오류, 가입 성공 안내와 이메일 자동 입력 후 로그인 이동.
- 비밀번호 찾기: 이메일 형식 확인, 실제 메일을 발송하지 않는다는 안내, 로그인 복귀.
- 로그아웃: 기존 헤더에 버튼 추가. 기존 미저장 작업 확인을 거친 뒤 화면 이동이 성공하면 Mock 세션을 삭제한다.
- 기존 환경설정 마법사를 재사용한다. 신규 가입자의 설정 완료 상태와 사무소 입력은 계정 ID별로 분리한다.
- 랜딩은 가상 수치임을 표시하고, 미구현 신고 기능을 **준비 중**으로 구분했다. 실제 고객·인증·실적·약관 내용은 만들지 않았다.

## 디자인

첨부 레퍼런스의 밝은 제품 중심 랜딩과 좌우 50:50 로그인 구성을 적용했다. 기존 Pretendard와 `--primary: #2457c5` 토큰을 유지했으며 업무 레이아웃 색상을 덮어쓰지 않았다. 폼 입력 높이는 44px, 주요 버튼은 40~44px이다. 760px 이하에서 인증 소개 패널을 축소하고 460px 이하에서 랜딩 카드와 사용 흐름을 한 열로 표시한다. 기존 공통 `UiModal`, `UiButton`, `UiIcon`을 재사용했다. Nuxt UI 패키지는 기존 프로젝트에 설치되어 있지 않아 별도 설치하지 않았다.

## 생성 및 수정 파일

`frontend/app/` 기준:

| 구분 | 파일 |
| --- | --- |
| 페이지 생성 | `pages/dashboard.vue`, `pages/login.vue`, `pages/register.vue`, `pages/forgot-password.vue` |
| 페이지 변경 | `pages/index.vue` (랜딩으로 변경; 기존 내용은 dashboard로 이동) |
| 레이아웃 생성 | `layouts/public.vue`, `layouts/auth.vue` |
| 랜딩 컴포넌트 생성 | `features/landing/ProductBrand.vue`, `LandingHeader.vue`, `HeroSection.vue`, `DashboardPreview.vue`, `FeatureSection.vue`, `WorkflowSection.vue`, `LandingFooter.vue` |
| 랜딩 스타일·데이터 생성 | `features/landing/entry.css`, `features/landing/mocks.ts` |
| 폼 컴포넌트 생성 | `features/auth/LoginForm.vue`, `RegisterForm.vue`, `ForgotPasswordForm.vue`, `PasswordField.vue` |
| Mock 계정 상태 생성 | `features/auth/useMockAuth.ts`, `mocks.ts`, `types.ts`, `validation.ts` |
| 기존 연결부 수정 | `utils/workspace-routes.ts`, `features/workspace/components/WorkspaceHeader.vue`, `features/onboarding/useOnboarding.ts` |

검증 파일: `frontend/tests/mock-auth.test.ts`, `entry.browser.mjs` 생성. 기존 `workspace.browser.mjs`, `onboarding.browser.mjs`, `pages-preview.browser.mjs`의 대시보드 진입 경로를 변경했다. 화면 캡처는 `frontend/tests/screenshots/`의 `landing-*`, `login-*`, `register-*`, `forgot-password-mobile.png`와 온보딩 캡처에 있다.

문서: 이 파일 생성, `requirements.md`, `frontend-architecture.md`, `onboarding.md`에 현재 진입 경로와 Mock 상태 예외를 기록했다.

## Mock 상태 및 저장 위치

- 고정 테스트 계정: `features/auth/mocks.ts`.
- 제품 미리보기·기능 소개 데이터: `features/landing/mocks.ts`.
- 신규 계정 목록: localStorage `accounting-pro:mock-accounts:v1`.
- 로그인 유지 체크 시 localStorage, 미체크 시 sessionStorage의 `accounting-pro:mock-session:v1`. 이 값은 화면 표시용이며 서버 권한이 아니다.
- 신규 계정 비밀번호 원문은 브라우저 저장소에 기록하지 않는다. 무작위 salt와 SHA-256 비교값만 저장하여 데모 로그인 시 입력값을 비교한다. 이는 제품용 비밀번호 보관·인증 방식이 아니며 실제 서버 연동 때 대체해야 한다.
- 이름·이메일과 Mock 계정 ID는 브라우저에 저장한다. 폼에는 테스트 정보 사용 안내가 있다.
- 기존 게스트/관리자 설정은 기존 `accounting-pro:onboarding-demo:v1` 키를 유지한다. 신규 계정은 뒤에 `:<계정 ID>`를 붙인다. 새 ID에는 완료 데이터가 없으므로 기존 마법사가 자동 표시된다.
- 저장 실패는 안내하고 메모리 상태로 진행한다. 이 경우 새로고침 후 계정·로그인 상태가 유지되지 않을 수 있다.

Nuxt `useState`는 [공식 문서 원문](https://github.com/nuxt/nuxt/blob/main/docs/4.api/2.composables/use-state.md)과 설치된 4.6.4의 `state.d.ts`를 확인해 사용했다. 요청 간 공유되는 모듈 전역 mutable 상태는 추가하지 않았다. 브라우저 저장소 읽기는 클라이언트 마운트 후 수행한다.

## 검증 결과

- `npm test`: 29개 통과 (신규 Mock 계정 검증 3개 포함).
- `npm run typecheck`: 통과.
- `npm run build`: 통과. 최초 Windows 산출물 권한 오류 후 권한 확장 실행에서 완료했다.
- `node tests/entry.browser.mjs`: 랜딩 링크/앵커/약관, 로그인 실패·성공, 비밀번호 표시, 로그인 유지·로그아웃, 가입 입력 오류·성공·중복, 원문 비밀번호 미저장, 새로고침 후 신규 계정 로그인, 계정별 온보딩 분리·완료 복원, 재설정 데모 통과.
- 390/768/1440px에서 공개 경로 4개 직접 접근, 가로 넘침 없음, Vue 및 hydration 경고 없음. 데스크톱·모바일 캡처를 직접 확인했다.
- `node tests/workspace.browser.mjs`: 기존 8개 시나리오 통과.
- `node tests/onboarding.browser.mjs`: 기존 5단계·CRUD·입력 보존·저장·완료·모바일·예외 흐름 통과.

브라우저 테스트는 로컬 프로덕션 서버에서 수행한다. Windows 예:

```powershell
$env:HOST='127.0.0.1'
$env:PORT='3002'
node .output/server/index.mjs
# 다른 터미널에서
$env:SELFBOOKS_TEST_URL='http://127.0.0.1:3002'
$env:SELFBOOKS_BROWSER='C:/Program Files/Google/Chrome/Application/chrome.exe'
node tests/entry.browser.mjs
```

`pages-preview.browser.mjs`는 대시보드 경로 변경을 반영했으며 GitHub Pages 배포 자체는 수행하지 않았다. 기존 API 회귀는 fixture 기반이며 실제 DB 업무 데이터에 쓰기 테스트를 하지 않았다.

## 후속 API 연결 지점

`useMockAuth.ts`의 `register/login/logout/restore`를 인증 서비스와 연결하고 Mock 저장소를 제거한다. 실제 회원 생성, 비밀번호 정책/검증, 이메일 확인·재설정 발송, 서버 세션·권한 검증은 별도 구현 대상이다. 계정별 온보딩 상태 조회·저장은 `useOnboarding.ts`의 저장 경계에 연결한다. 라우트 보호를 추가하더라도 실제 권한 검사는 서버가 수행해야 한다.

이번 변경은 프런트엔드·테스트·문서에 한정했다. 백엔드, Supabase, PostgreSQL, DB 스키마, 실제 인증 컨텍스트, 기존 업무 UI, 패키지 및 배포 설정은 수정하지 않았다.
