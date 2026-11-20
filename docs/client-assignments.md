# 수임업체 담당 관리 및 업체별 업무 진입

## 2026-11-20 DB 주담당 조회 연결

- 기존 임시 배정 정책보다 우선하여 `GET /api/clients` 및 단일 업체 조회에 `primaryAssignment: { userId, name } | null`을 포함한다.
- `public.client_assignments`의 `PRIMARY`와 `public.users`를 업체 ID·사무소 ID로 연결한다. DB 쓰기와 스키마 변경은 없다.
- 내 담당 업체와 공통 요약은 로그인 사용자 UUID와 DB 주담당 UUID를 비교한다. 재조회 시 DB 주담당 변경·해제가 임시 주담당 상태보다 우선한다.
- 보조담당의 DB 역할 코드와 조회 연결은 이번 변경에 포함하지 않으며 기존 임시 화면 상태를 유지한다.
- 정상 조회, 사용자 UUID 구분, 재배정·해제, 조회 오류 및 정책 차단 테스트를 추가했다. 테스트·타입 검사·빌드·DB 통합·브라우저/E2E: 미실행 — 사용자 요청 시 실행.

## 실제 업체 조회 전환 (후속 요청, 아래 초기 목업 정책보다 우선)

- 기본 수임업체 목록은 기존 인증 API `GET /api/clients` → Supabase PostgreSQL `public.clients` 조회 결과만 사용한다. `source=live` 쿼리가 없어도 같은 실제 데이터를 표시한다.
- 관리 세션은 빈 업체 배열로 시작한다. 샘플 업체 10개 주입과 조회 실패 시 목업 대체는 하지 않는다. 공개 미리보기에서도 샘플로 대체하지 않으며 실제 API 사용 불가 오류를 표시한다.
- 실제 응답 필드는 ID·사무소 ID·업체명·개인/법인·상태다. 사업자등록번호·대표자·주소·검토 정보는 기존 API가 제공하지 않으므로 정보 없음으로 표시한다. 검토 통계도 미제공 표시(—)를 사용한다.
- 업무 공간의 단일 조회 상태를 목록·대시보드·마이페이지·업무 홈이 공유한다. 로딩/오류/빈 결과를 구분하고 재시도를 제공한다. 직접 업체 URL 접근은 조회 완료 후 권한을 판단한다.
- 담당자 변경만 실제 업체 ID에 연결한 임시 화면 상태다. 화면 내 재조회에서는 ID별 배정을 유지하며 브라우저 새로고침에서는 초기화한다. 등록 저장 API가 없으므로 가짜 업체 추가 기능은 비활성화했다.
- 기존 백엔드의 사무소 및 `DEV_FIXTURE_CLIENT_IDS` 조회 범위는 유지한다. 소속 사무소의 모든 업체를 조회하는 API로 확장한 것은 아니다. DB 쓰기·SQL 실행·백엔드/API 계약 변경은 하지 않았다.
- 신규: `directory-mapping.ts`, `useManagedDirectory.ts`, `tests/directory-mapping.test.ts`. 기존 관리 세션/화면, workspace provider/context, 대시보드, 업무 홈 및 브라우저 테스트를 수정했다.
- 검증: 관련 단위 테스트 25개, 타입 검사, 프로덕션 빌드, 신규 조회/매핑 파일 및 해당 테스트 lint, API 응답 인터셉트 기반 브라우저 시나리오 통과. 브라우저는 실제 DB 접속 검증이 아니며 실제 계정의 원격 DB 조회는 미검증이다.

## 초기 구현 기록

2026-11-18. 프런트엔드 목업 범위. DB·SQL·Supabase·백엔드 인증·기존 API 계약은 변경하지 않았다.

## 구현

- `/client-directory`: 제목 아래 `내 담당 업체 / 전체 업체` 내부 메뉴. OWNER/ADMIN은 전체 업체가 기본이며 `?tab=mine`으로 내 담당 업체를 직접 열 수 있다. STAFF는 내 담당 업체만 표시한다.
- 내 담당 업체는 인증 사용자 ID와 `primaryId`, `secondaryIds`를 비교한다. 주담당을 우선 판정하여 중복 집계하지 않는다. 내 담당·주담당·보조담당·확인 필요 통계는 같은 원본 데이터에서 계산한다.
- 전체 업체의 등록정보 검토 대기는 `company !== '검토 완료'`, 내 담당 확인 필요는 등록정보 또는 환경설정 미완료를 업체 단위로 집계한다. 수임 상태 필터는 별도로 적용한다.
- 업체명/사업자번호 통합 검색, 기존 사업자번호·개인/법인·수임 상태·검토 상태 필터, ID 기반 담당자 필터, 내 담당 역할 필터, 초기화 및 5개 단위 페이지네이션을 제공한다. 통계는 탭 전체 범위, 테이블은 검색·필터 결과를 표시한다.
- 기존 상세 패널, 담당자 선택 다이얼로그, 등록 폼, 배지, CSS를 재사용한다. 주담당 1명·보조담당 여러 명을 활성 직원 중 선택하며 중복·주담당 겸임을 제거한다. 관리 권한은 버튼 표시와 저장 핸들러 양쪽에서 확인한다.
- 마이페이지·대시보드에 동일한 담당 업체 요약 컴포넌트와 `?tab=mine` 링크를 추가했다. 마이페이지의 기존 실제 프로필 조회는 유지한다.
- 로딩, 업체 미등록/미배정, 검색 결과 없음 메시지를 구분한다. 표는 가로 스크롤, 필터는 줄바꿈, 업체명·업무 열기는 키보드 버튼으로 제공한다.

## 데이터와 상태 수명

- 기존 사용자 8명·업체 10개를 유지한다. 기존 이름 기반 fixture를 세션 생성 경계에서 ID 관계로 정규화한다. 표시용 `primary`, `secondary`도 기존 화면 호환을 위해 유지한다.
- `Client`: 기존 필드 + `primaryId?: string`, `secondaryIds?: string[]`. 구형 fixture 호환 때문에 선택 필드지만 세션 생성·신규 등록·배정 저장에서는 ID 관계를 채운다.
- `DirectoryRole`: OWNER / ADMIN / STAFF. 인증 응답의 역할은 런타임에서 확인한다. 미인식 역할에는 관리 또는 업체별 업무 접근 권한을 부여하지 않는다.
- 실제 로그인 사용자가 기존 목업 사용자 목록에 없으면 그 인증 ID·이름으로 선택 항목만 추가한다. 이름/이메일로 자동 매칭하거나 샘플 업체를 자동 배정하지 않는다. 관리자가 현재 로그인 사용자를 배정하여 테스트할 수 있다.
- Pages Preview에서만 기존 첫 번째 목업 사용자를 OWNER로 사용한다. 실제 인증 로직은 변경하지 않는다.
- 상태는 기존 `managementSession(workspace.state)`의 reactive 메모리에 보관한다. 화면 이동과 업체 전환에도 유지되고 새로고침하면 초기화한다. 통계·테이블·업무 홈은 같은 세션을 사용한다.

## 화면 이동 및 업무 탭 정책

```text
마이페이지 / 대시보드 → /client-directory?tab=mine
업체 행 → 기존 우측 상세 패널
업무 열기 → /client-work?clientId=<업체 ID>
업무 홈 / 상세 바로가기 → 기존 업무 경로?clientId=<업체 ID>
```

- `/client-work`는 별도 글로벌 업무 탭이다. `/client-directory` 내부 조회 메뉴와 분리한다.
- 업무 홈은 업체명·사업자번호·개인/법인·내 담당 역할·수임 상태와 현재 달력 연도를 표시한다. 회계연도는 목업 표시이며 실제 회계기간 API는 미연결이다.
- 기존 `/settings`, `/accounts`, `/journal`, `/sales-journal` 경로를 연결한다. `/company`는 등록 안내만 있고 상세 입력 화면은 없으므로 업무 바로가기를 준비 중으로 비활성화했다. 기존 사이드바의 회사등록 안내 경로는 유지한다. 미존재 경로를 생성해 연결하지 않았다.
- 선택 업체 ID는 workspace의 별도 `clientId`와 업무 URL에 보관한다. 기존 서버 회사 컨텍스트나 데모 회사 ID를 바꾸지 않는다.
- 다른 업체로 전환할 때 기존 회사 전환 확인창을 사용한다. 취소하면 업체/탭/입력을 유지한다. 확인하면 열린 탭과 편집 세션을 초기화하고 새 업체 업무를 연다. 동일 업무를 여러 업체용 탭으로 동시에 열지 않는다.
- 기존 미저장 페이지 이동·탭 닫기·브라우저 이탈 확인을 유지한다. 업무 화면 내부 코드는 수정하지 않는다.
- 선택 업체의 탭은 기존 데모 회사용 localStorage 탭 스냅샷에 저장하지 않는다. 업체 ID가 있는 URL을 새로고침하면 해당 업체의 새 세션으로 시작한다. 신규 등록 업체 ID는 새로고침 후 목업 데이터에 없으므로 접근 불가 안내를 표시한다. 일반 관리 페이지에서 새로고침하면 선택 업체는 초기화된다.
- STAFF의 비배정/미존재 업체 및 업체 없이 직접 여는 업무 화면은 공통 레이아웃과 라우트 가드에서 차단한다. 전체 업체 실조회 링크도 숨기고 직접 URL 접근을 차단한다.

## 재사용 및 변경 파일

기존 AAT 레이아웃, 사이드바, 헤더, 글로벌 탭 디자인을 유지했다. 현재 프로젝트에는 Nuxt UI 패키지가 설치되지 않아 기존 Vue 컴포넌트와 디자인 토큰을 사용했으며 라이브러리를 추가하지 않았다.

신규:
- `frontend/app/features/management/assignments.ts`: ID 기반 배정·통계·접근 정책 순수 함수.
- `frontend/app/features/management/useClientAssignments.ts`: 인증/목업 데이터 조합.
- `frontend/app/features/management/client-work.ts`: 실제 업무 경로와 업무 범위 분류.
- `frontend/app/features/management/components/AssignedClientSummary.vue`: 공통 담당 업체 요약.
- `frontend/app/pages/client-work.vue`: 업체별 업무 홈.
- `frontend/tests/client-assignments.test.ts`: 정상·예외 단위 테스트.
- `frontend/tests/client-assignments.browser.mjs`: 목업 인증·API 기반 브라우저 테스트.
- `docs/client-assignments.md`: 구현·검증·후속 연동 기록.

수정:
- `.gitignore`: 이번 구현 보고서만 문서 무시 규칙에서 제외.
- `frontend/app/features/management/ManagementView.vue`: 내부 메뉴, 권한, 배정 저장, 마이페이지 연결.
- `frontend/app/features/management/components/ManagementClientList.vue`: 통계, 필터, 페이지네이션, 업무 진입.
- `frontend/app/features/management/components/ManagementClientDrawer.vue`: 관리자 전용 배정·업무 바로가기.
- `frontend/app/features/management/components/ManagementActionDialog.vue`: 사용자 ID 기반 선택.
- `frontend/app/features/management/data.ts`: 담당 관계 타입 확장.
- `frontend/app/features/management/session.ts`: 기존 fixture의 ID 관계 정규화.
- `frontend/app/features/management/management.ts`: 통합 검색·담당자 필터.
- `frontend/app/features/management/view-types.ts`: 업무 목적지 타입.
- `frontend/app/features/workspace/stores/workspace.ts`: 선택 업체 ID.
- `frontend/app/features/workspace/composables/useWorkspaceNavigation.ts`: 업체 전환 확인·탭 초기화·URL 전달.
- `frontend/app/features/workspace/composables/useWorkspacePreferences.ts`: 업체 선택 세션의 데모 탭 저장 방지.
- `frontend/app/features/workspace/composables/useWorkspaceProvider.ts`: 업무 접근 UI 정책.
- `frontend/app/features/workspace/components/WorkspaceLayout.vue`: 접근 불가 안내 및 선택 업체 연동 상태 안내.
- `frontend/app/pages/dashboard.vue`: 담당 업체 요약.
- `frontend/app/utils/workspace-routes.ts`: 업무 홈 탭 등록.
- `frontend/tests/management.browser.mjs`: 기존 검색 레이블·페이지 크기 기대값 갱신.
- `docs/requirements.md`: 이번 범위와 상세 기록 연결.

## 후속 API/STAFF 적용

1. 실제 사무소 소속 직원 목록·업체별 담당자 조회 및 배정 저장 API 연결. 서버에서 관리자 권한·사무소 경계·활성 사용자·주담당 1명 등을 검증해야 한다.
2. STAFF 로그인 허용과 서버의 업체별 조회/변경 권한 검증. 프런트 버튼 숨김·가드는 보안 경계가 아니다. `useWorkspaceProvider.ts`에 TODO를 남겼다.
3. 각 회계 화면과 API의 회사·회계기간 범위를 선택 업체의 실제 ID에 연결해야 한다. 현재 기존 업무 API는 서버 지정 회사 기준으로 동작한다. 이를 업무 화면 상단에 명시한다. 이번 작업에서는 다른 개발자의 회계 업무 화면을 변경하지 않았다.
4. 실제 회계연도/기간 선택, 미구현 회사등록 상세 화면, 배정 변경의 영구 저장 및 사용자별 복원 정책은 별도 연동 범위다.

## 검증

- 관련 단위 테스트 19개 통과(담당 정책 5개 + 기존 관리/작업 공간 14개).
- 타입 검사 및 프로덕션 빌드 통과.
- 브라우저: ADMIN/OWNER 기본 메뉴, STAFF 제한, 검색·페이지네이션, 상세/배정 변경·통계, 업체 전환 취소/확인·탭 초기화, 새로고침 목업 초기화, 대시보드 링크, 390px 모바일 문서 가로 넘침 확인 통과.
- 전체 lint는 기존 코드 포함 4,767건(오류 3,299·경고 1,468)으로 실패했다. 범위 밖 파일에 일괄 자동 수정을 적용하지 않았다.
- 신규 파일 7개의 lint 통과. 미저장 환경등록 입력의 페이지 이동 취소/확인과 업체 전환 후 편집 탭 초기화도 브라우저에서 통과했다. 데스크톱/모바일 스크린샷으로 배치를 확인했다.
- 실제 계정·DB/API 통합 검증은 이번 목업 작업에서 실행하지 않았다. 기존 전체 브라우저 회귀 suite는 미실행 — 사용자 요청 시 실행.
