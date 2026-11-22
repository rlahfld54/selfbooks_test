# 미사용 코드 및 재사용 점검 (2026-11-22)

## 삭제한 구현

실제 페이지 import, 템플릿 자동 등록 컴포넌트, 작업 메뉴, 앱 전체 참조 및 테스트 참조를 확인했다.

- `features/accounts/AccountManagementPage.vue`: `/accounts`가 사용하는 `AccountManagement.vue`와 별도로 남은 구현.
- `features/previews/AccountManagement.vue`, `registrationSession.ts`: 현재 계정관리 화면에서 호출하지 않는 초기 미리보기와 전용 상태.
- `features/journal/`: `/journal`이 `features/vouchers/VoucherView.vue`를 사용하므로 이전 화면·세션·샘플 행 제거.
- `features/auth/RegisterForm.vue`, `useMockAuth.ts`, `mocks.ts`: `/register`는 `SignupFlow.vue`를 사용하며, 구형 가입 폼 전용 인증 상태는 다른 호출부가 없음.
- `features/onboarding`의 Vue UI, `useOnboarding.ts`, CSS 및 해당 UI만 찾는 `tests/onboarding.browser.mjs`: 앱에서 wizard를 마운트하는 경로가 없음. 기존 테스트가 사용하는 types/mocks/validation은 유지.
- `VoucherGridCell.vue`, `VoucherTypeTabs.vue`: 현재 매입매출 화면에 import/템플릿 사용처가 없는 이전 UI.
- `vouchers.css`: 주석만 남은 빈 파일. `refine-accounts.cjs`: 이미 적용된 소스 문자열 치환용 일회성 스크립트.

페이지 라우트 자체는 모두 메뉴 레지스트리 또는 인증·진입 경로에 연결되어 있어 삭제하지 않았다. 결산·인사급여·세무·보고서·기초잔액의 준비 중 화면은 `WorkspacePreview`를 공유한다. 공개 미리보기용 서비스와 테스트 fixture는 실제 사용처가 있어 유지했다.

## 공통화 후보

| 현재 구현 | 중복되는 부분 | 권장 방향 / 주의점 |
| --- | --- | --- |
| `components/AmountInput.vue`, `NumberInput.vue`, `features/sales-journal/SalesAmountInput.vue` | 입력 DOM, 숫자 처리, 포커스 및 금액 표시 | 공통 입력 기반과 정수 정규화 유틸. SalesAmountInput은 잘못된 입력을 검증 계층에 전달하므로 현재 정규화 차이를 보존해야 함. |
| `components/UiModal.vue`, `features/management/ManagementDialog.vue` | dialog 열기·닫기, Escape, drawer | 공통 dialog 수명주기 composable부터 추출. 포커스 복원·스크롤 잠금·배경 클릭 정책을 명시한 뒤 공통 UI로 통합. |
| `features/vouchers/VoucherView.vue`, `features/sales-journal/SalesJournalView.vue`, `SalesVoucherBoard.vue` | 조회 툴바, 행 선택, 전표 편집·상세·합계 | 조회/선택/상태 표시부터 공통화. 일반전표 모델과 서버 기반 매입매출 모델의 저장·검증은 별도 유지. |
| `features/management/components/ManagementClientList.vue`, `ManagementStaffList.vue`, 거래처 목록 | 조회 조건, 테이블 빈 상태, 행 선택, 상세 열기 | 기존 SearchPanel/DataTable/EmptyState를 우선 재사용하고 화면별 열·필터는 props/slots로 주입. |

`formatAmount`, `number-validation`, `defineTabSession`, `useBackendApi`, 공통 `Ui*`는 이미 공유하므로 같은 역할의 신규 유틸/컴포넌트를 만들기 전에 먼저 확인한다. 이번 변경은 미사용 구현 제거 및 스타일 통합이며 위 후보의 업무 동작을 합치는 리팩터링은 포함하지 않는다.

## 스타일

기능별 CSS와 Vue 내부 스타일을 `app/assets/css/main.css`로 통합했다. 이전 scoped 선택자는 명시적인 `data-ui-*` 속성으로 범위와 우선순위를 보존한다. 텔레포트되는 모달 내용에도 속성을 부여해 화면 밖으로 이동해도 스타일이 유지된다. 정적 열 너비는 공통 클래스로 옮겼다. 런타임 치수는 CSS 변수 값만 템플릿에서 전달한다.

## 검증

- 프런트엔드 타입 검사 및 프로덕션 빌드 통과.
- 테스트 150건 중 147건 통과. 인증 스토어 테스트 2건과 일반전표 열 readonly 테스트 1건 실패. 관련 스토어·전표 모델·테스트 소스는 이번 변경에 포함하지 않았다.
- Vue 전체 템플릿 컴파일과 스타일 단일 소유 규칙 테스트 통과.
- 브라우저 실행은 가능했지만 로컬 서버 탐색이 `ERR_NETWORK_ACCESS_DENIED`로 차단되어 시각 검증은 완료하지 못했다.
