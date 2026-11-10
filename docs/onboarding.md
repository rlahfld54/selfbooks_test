# Accounting Pro 최초 환경설정 UI

서비스 진입 UI 추가 이후 홈 대시보드 경로는 `/dashboard`이다. 신규 가입 계정의 설정은 기존 저장 키에 계정 ID를 붙여 분리한다. 마법사 단계·입력·검증 기능은 그대로 재사용한다. [서비스 진입 UI 기록](entry-ui.md)을 참고한다.

2026-11-10 구현. 실제 API, 인증, DB와 연결하지 않는 프런트엔드 프로토타입이다.

## 실행

프로젝트의 `frontend` 디렉터리에서 `npm run dev` 실행 후 콘솔의 Local 주소로 접속한다. 최초 홈 진입 시 마법사가 열린다. 완료 후에는 홈 우측 상단 **시작 가이드**로 다시 연다.

## 파일 및 구조

| 파일 (`frontend/` 기준) | 역할 |
| --- | --- |
| `app/features/home/HomeDashboard.vue` | 기존 대시보드 툴바에 마법사 진입 버튼 추가 |
| `app/features/onboarding/OnboardingWizard.vue` | 다이얼로그, 버튼, 하위 화면 조립, 포커스 복귀 및 스크롤 잠금 |
| `app/features/onboarding/OnboardingStepNavigation.vue` | 좌측 단계 메뉴, 모바일 상단 단계 |
| `app/features/onboarding/OnboardingProgress.vue` | 5구간 진행률 |
| `app/features/onboarding/OfficeInfoStep.vue` | 사무소 6개 입력 항목 |
| `app/features/onboarding/UserPermissionStep.vue` | 직원 이름·권한 수정, 모의 초대, 삭제 |
| `app/features/onboarding/BusinessSettingsStep.vue` | 연도·기간·표시 형식·시작 화면·알림 |
| `app/features/onboarding/ClientRegistrationStep.vue` | 거래처 CRUD, 엑셀 안내, 나중에 등록 |
| `app/features/onboarding/SetupSummaryStep.vue` | 전체 요약 및 단계별 수정 이동 |
| `app/features/onboarding/useOnboarding.ts` | 상태 수명, 최초 표시, 저장·복원, 완료, 초기화 |
| `app/features/onboarding/types.ts` | 사무소·직원·거래처·업무환경 타입 |
| `app/features/onboarding/mocks.ts` | 단계 정보와 독립된 기본 데이터 생성 함수 |
| `app/features/onboarding/validation.ts` | 입력 검증과 저장소 데이터 구조 검증 |
| `app/features/onboarding/onboarding.css` | 기능 전용 스타일 및 반응형 배치 |
| `tests/onboarding.test.ts` | 기본 데이터, 필수 입력, 형식·기간 오류, 손상 상태 테스트 |
| `tests/onboarding.browser.mjs` | 첫 방문부터 완료·재실행까지 실제 브라우저 검증 |
| `tests/workspace.browser.mjs` | 기존 회귀 테스트를 설정 완료한 사용자 조건에서 실행 |
| `tests/screenshots/onboarding-desktop.png`, `onboarding-mobile.png` | 브라우저 검증 화면 |

공통 `UiButton`, `UiIcon`, `UiModal`과 기존 색상 토큰을 재사용한다. 새 라우트·레이아웃·패키지는 추가하지 않았다.

## 동작 및 상태 정책

- 사무소 필수값, 사업자등록번호 표시 형식, 연락처·이메일, 직원 이름, 연도·기간을 검증한다. 세법 검증이나 사업자번호 실재 여부 확인은 하지 않는다.
- 앞으로 이동할 때 현재 단계 검증, 완료할 때 모든 단계 검증을 수행한다. 이전 단계 이동은 입력 수정을 위해 허용한다.
- 전체 설정은 전용 `accounting-pro:onboarding-demo:v1` localStorage에 자동 보관하며 **임시 저장** 버튼으로 저장 안내도 확인할 수 있다. 기존 작업 공간 저장소와 독립적이다.
- **다시 시작**은 입력을 유지하고 1단계로 이동한다. **테스트 데이터 초기화**는 확인 후 샘플과 미완료 상태로 복원한다.
- **건너뛰기/닫기**는 완료 처리가 아니다. 다시 방문하거나 새로고침하면 미완료 마법사가 열린다.
- **설정 완료**는 완료 상태를 저장하고 메시지와 함께 모달을 닫는다. 새로고침 후 자동 표시하지 않는다.
- 저장소 접근 실패는 안내하고 메모리에서 동작한다. 손상된 저장값은 기본 데이터로 복구한다.
- 업무환경 선택은 요약·복원에 반영되며 기존 업무 화면, 알림 시스템, 로그인 후 라우팅을 실제 변경하지 않는다.
- 초대 메시지 발송, 엑셀 업로드·파싱, 서버 저장은 수행하지 않는다.

## 디자인 및 기존 프로젝트 보존

940px 중앙 모달, 88dvh 상한, 배경 오버레이, 로켓 일러스트, 단계 메뉴, 진행률, 흰색 입력 영역, 고정 하단 버튼을 구현했다. 720px 이하에서 상단 단계 메뉴, 420px 이하에서 단일 열 폼으로 전환한다. 내용은 모달 내부에서 스크롤된다.

기존 사이드바는 레퍼런스의 다크 네이비보다 밝은 블루 계열이다. 기존 디자인 시스템 보호를 위해 이를 유지했다. 기존 대시보드 통계·차트·처리 내역·공지·메뉴·라우팅은 유지했다. 백엔드, Supabase, PostgreSQL, 인증 코드 및 패키지 설정은 수정하지 않았다.

## 검증

- `npm test`: 26개 통과 (신규 4개 포함).
- `npm run typecheck`: 통과.
- `npm run build`: 통과.
- `node tests/onboarding.browser.mjs`: 5단계, 입력 보존, 유효성 검사, 직원/거래처 CRUD, 임시 저장·새로고침, 완료·새로고침, 초기화, 모바일, 닫기·건너뛰기, hydration 확인.
- `node tests/workspace.browser.mjs`: 기존 8개 시나리오 통과. 라우팅·히스토리·탭 입력·취소/폐기·회사별 복원·API fixture·모바일·기존 화면/갤러리 확인.
- 실제 브라우저 캡처는 1440×1000, 390×844에서 확인했다.

브라우저 검증 시 로컬 Nuxt 서버를 먼저 실행하고 필요하면 `SELFBOOKS_TEST_URL`과 `SELFBOOKS_BROWSER` 환경변수로 주소와 설치된 Chrome 실행 파일을 지정한다. 검증은 `http://127.0.0.1:3002`의 프로덕션 빌드에서 수행했다. 기존 API 검증은 fixture를 사용했으며 실제 DB 연결·전표 저장 테스트는 이번 범위에 포함하지 않는다.

## 추후 API 연동

`useOnboarding.ts`의 읽기/저장/완료 처리 뒤에 서비스 계층을 추가하면 Mock 데이터 공급원을 교체할 수 있다. 별도 확정이 필요한 계약은 회사·사용자별 완료 상태 조회, 사무소 정보 저장, 직원 초대·권한·삭제, 업무환경 설정 저장, 거래처 CRUD 및 엑셀 가져오기다. 서버 인증 컨텍스트와 실제 권한 검증은 그 단계에서 연결해야 한다. 현재 브라우저 완료 값이나 직원 권한 값은 서버 권한으로 사용할 수 없다.
