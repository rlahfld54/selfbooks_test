# SelfBooks 프런트엔드 아키텍처

Nuxt API 사용과 공식 자료 확인 기준은 [Nuxt 개발 지침](nuxt-guide.md)을 따른다. 기능 서비스는 API 클라이언트를 주입받으며, Nuxt runtimeConfig와 조회 수명은 composable에서 관리한다.

Nuxt 4.6.4의 파일 기반 라우팅과 레이아웃을 사용한다. 업무 페이지는 URL을 가지며, 탭은 해당 페이지를 다시 열기 위한 작업 목록이다. Vue Composition API를 유지하며 별도 상태 라이브러리는 사용하지 않는다.

## 디렉터리와 책임

```text
frontend/
  app/
    app.vue                   NuxtLayout과 NuxtPage
    layouts/default.vue       작업 공간 조립과 컨텍스트 제공
    pages/                    URL, definePageMeta, 업무 화면 조립
    components/               업무에 의존하지 않는 공통 UI
    features/
      workspace/              작업 공간 components, composables, stores
      home/                   홈 샘플 대시보드
      journal/                일반전표 UI, 입력 상태, 예시 분개
      demo-partners/          거래처 조회·검색·상세에 쓰이는 개발용 샘플
      client-directory/       Fastify 수임업체 조회 화면·상태·서비스·응답 타입
      previews/               후속 업무의 기존 자리표시 화면
      component-gallery/      공통 컴포넌트 데모
    composables/              업무의 작업 공간 접근점, 탭 세션·검색·API 재사용 로직
    services/api-client.ts    공통 HTTP 처리
    types/                    공통 상태와 UI 계약
    utils/                    업무 경로 카탈로그, 순수 상태 전이, 금액 표시
    middleware/               향후 Nuxt 접근 정책의 위치
    assets/main.css           기존 디자인 토큰과 공통·반응형 스타일
  tests/                      상태·API 단위 테스트와 브라우저 회귀 테스트
```

`default.vue`는 사이드바, 헤더, 업무 탭, 페이지 슬롯, 상세 패널, 확인창의 배치를 맡긴다. 해당 요소의 동작은 `features/workspace/components/Workspace*.vue`와 관련 composable에 둔다. `Ui*`, `DataTable`, `SearchDialog`, `SearchPanel`, `DetailPanel`은 props, 슬롯, 타입이 지정된 emit으로 연결한다. 공통 UI는 업무 모듈의 서비스나 레코드 타입에 의존하지 않는다. 업무 모듈은 공통 UI를 사용하고 자체 도메인 타입과 서비스에 의존한다. 여러 화면의 기존 데모에서 사용하는 거래처 검색·상세는 `demo-partners`에 모았다. 실제 전표나 거래처 API와는 별개다.

## 라우팅과 탭

`features/workspace`는 앱 조립 계층이다. `useWorkspaceProvider`가 레이아웃마다 store와 탐색 동작을 만들고 컨텍스트를 제공한다. 업무 화면은 공통 접근점인 `composables/useWorkspaceContext`를 사용한다. 작업 공간 컴포넌트는 레이아웃에서 명시적으로 import하며 전역 자동 등록에 의존하지 않는다. 작업 공간의 상세 패널은 업무 컴포넌트를 조립할 수 있지만, 공통 `components/`는 업무 기능을 import하지 않는다.

| URL | 화면 |
| --- | --- |
| `/` | 홈 |
| `/journal` | 일반전표 입력 데모 |
| `/clients` | 거래처관리 데모 |
| `/client-directory` | Fastify의 개발용 수임업체 읽기 화면 |
| `/ledger` | 전표조회 레이아웃 데모 |
| `/sales`, `/payroll`, `/tax`, `/reports`, `/settings` | 기존 업무 자리표시 화면 |
| `/components` | 공통 UI 갤러리 |

페이지에 `definePageMeta({ workspaceTab: '…' })`를 선언하고, `utils/workspace-routes.ts`에 고유한 탭 ID, 경로, 제목, 아이콘을 등록한다. 파일이 경로를 정의하고, 카탈로그는 메뉴와 탭이 사용할 이동 대상만 제공한다. URL이 활성 화면을 결정한다. 메뉴·탭 클릭은 라우터로 이동하고, 성공한 라우트에서 해당 탭을 한 번만 연다. 브라우저의 뒤로·앞으로 이동과 직접 접근에도 같은 규칙이 적용된다. 홈 탭은 닫을 수 없다. 활성 탭을 닫으면 왼쪽 탭으로 이동하고, 비활성 탭을 닫으면 URL은 유지된다.

직접 접근 또는 새로고침에서는 현재 URL이 우선한다. 브라우저 저장소에서 이전 회사와 열려 있던 탭을 복원하고, 홈으로 접속했을 때는 이전 활성 업무를 **이어서 열기**로 제공한다. 회사 전환을 승인하면 현재 회사의 UI 스냅샷을 저장하고 대상 회사의 탭과 마지막 URL을 복원한다. 현재 회사의 미저장 입력과 검색 조건은 복원하지 않는다.

## 상태와 미저장 데이터

| 상태 | 위치와 수명 |
| --- | --- |
| 현재 화면, 경로 파라미터, 공유 가능한 URL 조건 | Nuxt 라우터 |
| 사용자·회사, 열린 탭, 미저장 표시, 패널 너비, 밀도·사이드바 설정 | 요청 간 공유하지 않는 `features/workspace/stores/workspace.ts` |
| 편집값, 자유 검색어, 선택 행, 정렬·페이지 | 해당 기능의 `defineTabSession` 상태. 열린 탭 객체의 수명과 동일 |
| 목록과 상세 응답 | 기능별 `useAsyncData`. 화면을 다시 열 때 조회하고 떠날 때 취소·정리 |
| 모달 열림, 포커스 등 일시 UI | 표시 중인 컴포넌트 |

페이지 컴포넌트는 필요할 때만 마운트한다. `KeepAlive`를 사용하지 않는다. 업무 입력은 `defineTabSession(() => 초기값)`으로 생성하고 현재 탭 객체를 키로 사용한다. 닫거나 회사를 전환하면 탭 객체를 교체하여 이전 세션이 다시 사용되지 않도록 한다. 기존 샘플 패널은 탭별로 열림, 선택 행, 검색어를 메모리에 유지한다. 데스크톱에서는 콘텐츠 영역을 줄이고, 좁은 화면에서는 오버레이로 열린다.

편집을 시작한 기능은 `setDirty(tab)`를 호출한다. 나중에 저장 기능이 생기면 서버 저장이 성공한 뒤 `setDirty(tab, false)`를 호출한다. 탭 닫기와 회사 전환은 승인 후에만 데이터를 폐기한다. 사이드바 이동과 브라우저 뒤로·앞으로 이동으로 미저장 페이지를 떠날 때도 확인한다. 이동을 승인해도 해당 탭을 닫기 전까지 입력은 메모리에 남는다. 탭 막대에서 이미 열린 작업 사이를 전환하는 경우에는 작업이 보존되므로 확인창 없이 이동한다. 새로고침과 브라우저 종료는 열린 탭 중 하나라도 미저장 상태이면 `beforeunload`를 사용한다. 이때 브라우저가 표시 여부와 문구를 제어한다.

`accounting-pro:v1` 저장소에는 사용자별 밀도·사이드바 설정과 마지막 데모 회사, 회사별 탭 ID·활성 탭·패널 너비만 기록한다. 검색어, 선택 행, 응답, 인증 정보, 입력값은 제외한다. 잘못된 탭 ID와 손상된 설정은 건너뛴다. 브라우저 저장소 접근 실패는 화면에 안내하고 메모리에서 동작을 계속한다.

## API와 접근 정책

데이터 경로는 Nuxt → Fastify → Supabase PostgreSQL이다. UI 컴포넌트는 HTTP나 DB를 직접 호출하지 않는다. 기능 composable이 서버 상태와 재조회 정책을 관리하고, 기능 서비스가 계약에 명시된 엔드포인트를 호출한다. `useBackendApi`는 공개 런타임 설정 `NUXT_PUBLIC_API_BASE`를 공통 API 클라이언트에 전달한다. 클라이언트는 타입이 지정된 응답, 취소 신호, 요청 제한 시간, HTTP 오류를 처리한다. 기본 자격 증명 정책은 동일 출처 쿠키이며, 현재 서버에는 실제 사용자 로그인과 인증 토큰 계약이 없다.

[API 명세](api-spec.md)에 있는 수임업체 목록과 상세 GET만 연결했다. 서버는 각 요청에서 자체 개발용 조회 범위를 적용한다. 회사 선택값은 프런트엔드 상태이며 API 권한이나 회사 ID로 전송하지 않는다. 수임업체 데이터는 재진입할 때 다시 요청한다. 인증 도입 시 Nuxt의 named middleware를 페이지에 적용하되 권한 검증은 Fastify에서 매번 수행한다. 계약이 없는 등록·수정·삭제나 전표 저장은 서비스에 추가하지 않는다. 데모 자료는 `mock*` 서비스와 화면의 샘플 배지로 구분한다.

## 새 업무 추가 순서

1. `features/<업무>/`에 화면을 만들고, 필요한 경우에만 `components/`, `composables/`, `services/`, `types/`로 분리한다.
2. `pages/`에 화면을 연결하고 고유한 `workspaceTab`을 선언한다. 경로와 표시 정보를 카탈로그에 넣고 해당 메뉴 그룹에 배치한다.
3. 보존해야 하는 편집·조회 조건은 업무의 탭 세션에 둔다. 탭을 닫거나 회사가 바뀐 뒤 초기화되는지 확인하고, 편집 상태는 `setDirty`로 연결한다.
4. 검색은 공통 검색 UI에 기능 데이터를 전달한다. 업무 상세 패널이 필요하면 `WorkspaceDetail`의 패널 선택을 확장하고 내용 컴포넌트와 조회는 해당 기능에 둔다.
5. 기존 토큰과 UI props/emit을 우선 사용한다. 공통 UI 수정은 `/components`와 실제 사용 화면에서 함께 검증한다. 기능 전용 스타일과 로직은 해당 기능에 둔다.
6. 새 URL의 직접 접근, 메뉴, 탭, 히스토리, 취소·폐기, 재조회와 반응형 동작을 검증한다.

## 검증 명령

2026-11-09 작업 공간 구조 정리 검증: Node 테스트 18개, Nuxt 타입 검사, 프로덕션 빌드 통과. 빌드 결과를 로컬 서버로 실행한 Chrome 회귀 테스트 8개 시나리오도 통과했다(직접 접근, 메뉴·히스토리, 탭별 입력·검색·패널, 취소·폐기, 회사별 복원, API 계약 fixture, 390px 모바일·hydration, 기존 화면·갤러리). 샌드박스의 파일·로컬 네트워크 제한 때문에 빌드와 브라우저 검증은 권한 확장 환경에서 실행했다. 실제 Fastify/DB 연동 검증은 포함하지 않는다.

`frontend/`에서 `npm test`, `npm run typecheck`, `npm run build`를 실행한다. 로컬 Nuxt 서버를 띄운 후 `node tests/workspace.browser.mjs`로 실제 브라우저에서 회귀 테스트를 실행한다. Playwright는 검증 환경에 준비된 설치본을 사용하며, 필요하면 `SELFBOOKS_PLAYWRIGHT`에 모듈 경로, `SELFBOOKS_BROWSER`에 Chromium 기반 브라우저 실행 파일, `SELFBOOKS_TEST_URL`에 Nuxt 주소를 지정한다. 수임업체 브라우저 테스트는 Fastify 계약과 일치하는 테스트 응답을 사용한다. 실제 Supabase 연결 검증은 별개다.
