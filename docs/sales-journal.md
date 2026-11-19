# 매입매출전표 구현 기록

화면: 회계관리 → 매입매출전표입력, `/sales-journal`.

## 2026-11-19 참고 이미지 기반 화면 개편

- 파란 제목 표시줄, 유형 탭, 기간/월별 조회, 년·월·일 열과 격자형 전표 목록, 조회 합계, 차변·대변 분리 입력, 우측 접이식 관리 패널, 하단 고정 작업바를 적용했다. 기존 공통 작업 공간과 실제 전표 API는 유지한다.
- 전체/매출 과세/매입 과세 및 매출·매입 카드/현금 필터를 제공한다. 과세 탭은 해당 유형 전체, 카드·현금 탭은 거래유형과 결제방법의 교집합이다. 증빙 종류나 추가 거래유형을 추측하지 않는다.
- 월별 조회는 선택 월의 첫날~말일을 포함하며 윤년을 처리한다. 조회 조건과 합계에 동일한 필터를 사용한다.
- 전표는 단일 선택하며 신규·저장·삭제와 미저장 변경 확인을 유지한다. 분개 구분 변경 시 같은 금액을 해당 차변/대변 열로 옮겨 표시한다. 확정/마감 보호와 서버 검증은 기존 계약을 유지한다.
- 사원·부서·현장·프로젝트·제품은 API 저장 필드가 없어 비활성 상태와 연동 준비 안내로 표시한다. 코드변환·일괄적용·일괄분개·복사·이동·인쇄는 이번 구현에 포함하지 않는다.
- 변경 파일: `SalesJournalView.vue`, `useSalesJournal.ts`, `useSalesJournalSession.ts`, `services/salesJournal.ts`, `frontend/tests/sales-journal.test.ts`, 본 문서와 `docs/requirements.md`.
- 정상/예외 테스트 코드 추가: 유형·결제방법·기간·검색 조합, 결과 없음, 월말/윤년/잘못된 월 입력.
- 단위 테스트·타입 검사·빌드·DB 통합·브라우저/E2E: **미실행 — 사용자 요청 시 실행**. 참고 이미지와의 실제 브라우저 배치 일치는 미검증이다.

첨부 이미지를 참고해 유형 탭, 기간 검색, 전표 목록, 합계, 하단 전표·분개 입력, 우측 안내를 기존 UI 스타일에 맞춰 구성했다. 거래처는 F2 검색, 계정과목은 DB 선택 목록을 사용한다. 등록·조회·수정·삭제는 해솔문구 본점 PostgreSQL 데이터에 연결된다.

## 주요 파일

- `frontend/app/pages/sales-journal.vue`: 페이지 진입점.
- `frontend/app/features/sales-journal/`: 화면, 금액 입력, 탭 상태, API 서비스와 데이터 타입.
- `frontend/app/utils/workspace-routes.ts`, `frontend/app/features/workspace/components/WorkspaceSidebar.vue`, `frontend/app/layouts/default.vue`: 회계관리 메뉴·탭·DB 상태 안내.
- `backend/src/services/sales-context.ts`, `sales-validation.ts`, `sales-repository.ts`: 개발 인증 범위, 회계 검증, DB 트랜잭션.
- `backend/src/routes/sales.ts`, `app.ts`, `server.ts`, `plugins/local-access.ts`: API 연결과 로컬 JSON 쓰기 제한.
- `backend/migrations/001_sales_vouchers.sql`, `backend/src/db/migrate-sales.ts`: 추가 스키마와 적용 명령.
- `frontend/tests/sales-journal*`, `backend/tests/sales*`: 단위·브라우저·실DB 통합 검증.

## 저장 정책

사용자 확인 기준으로 `draft` 상태만 저장하고 수정·삭제한다. 차대 합계가 다르면 저장을 거부한다. 열린 회계기간의 날짜와 회사별 거래처/계정만 사용한다. 11·51의 세액 0원은 확인요망이며 확인 체크 후 저장한다. 다른 유형을 추측해 지원하지 않는다. 전표마다 서버 회사·사업장·기간 식별자가 저장된다.

## 실행과 검증

- 서버: 루트 `npm run dev`.
- 마이그레이션: `npm --prefix backend run db:migrate:sales`.
- 테스트: 각 패키지 `npm test`, `npm run typecheck`, `npm run build`.
- 실DB 검증: `npm --prefix backend run test:integration:sales`. 이 명령은 검증용 전표를 생성·수정하고 finally에서 자신이 만든 UUID의 레코드만 정리한다. 기존 전표/마스터는 변경하지 않는다.
- 브라우저: frontend에서 `node tests/sales-journal.browser.mjs`, `node tests/workspace.browser.mjs`. Playwright 의존성이 포함되며 설치된 Chrome 경로 또는 `SELFBOOKS_BROWSER`를 사용한다. 전표 브라우저 테스트도 자신의 검증 전표를 삭제한다.

## 남은 범위

세액 자동계산·절사, 자동분개, 부가세 계정 등 마스터 추가, 전표 확정, 전자세금계산서·신고 연동, 실제 사용자 인증은 후속 범위다. 기존 계정과목 마스터에 없는 계정을 자동 생성하지 않는다. 전표번호는 `PS-UUID`이며 업무 일련번호 규칙은 미정이다. 조회는 현재 개발 회사 전체 목록을 읽어 화면에서 필터링한다. 대량 데이터의 서버 검색/페이지네이션은 후속 작업이다.

## 검증 결과 (2026-11-10)

- 백엔드 단위/API 테스트 10개, 프런트엔드 단위 테스트 21개 통과.
- 양쪽 타입 검사 및 빌드 통과.
- 실제 DB 통합: 등록·재조회·수정·삭제, 세액 0원 확인, 회사/계정 소속, 기간 밖 날짜, 확정 보호, 동시 수정 버전, 중복 요청, 분개 삽입 실패 시 원자적 롤백 통과. 검증 데이터 정리 완료.
- 전표 브라우저: 서버 오류 안내, 저장 후 새로고침, 수정·삭제, 삭제 취소, 미저장 입력 보호, 390px 화면, hydration 검사 통과.
- 기존 작업 공간 브라우저: 직접 접근·메뉴·히스토리·탭 입력·회사 전환·모바일·갤러리 복원 통과. SSR HTML 표시 후 hydration이 완료되기 전에 입력하던 테스트의 간헐적 실패를 막기 위해 완료 상태 대기를 추가했다.
- 화면 캡처: `docs/ui-screenshots/sales-journal-1440.png`, `sales-journal-390.png`.


## 2026-11-19 매입매출전표 업무 확장

현재 DB 구조·저장 대상·추가 기능·검증·남은 범위는 [매입매출전표 확장 구현](sales-workbench.md)을 따른다. 이전 문서의 11/51 전용, 물리 삭제, 해솔문구 고정 회사 및 자동분개 미지원 설명은 이번 적용 범위에서 대체된다.


## 2026-11-19 일반전표 UI 통일

- 사용자 후속 요청으로 매입매출 화면을 일반전표의 PageToolbar, vouchers.css, 공통 Ui 컴포넌트 구성에 맞췄다. 파란 제목 띠와 고정 하단 작업바를 제거하고 흰색 제목 영역·조회 바·선택 전표/분개 접기·상태 표시줄로 통일했다.
- 일반전표와 작업 공간의 밀도 상태를 공유하며 32px 기본/27px 압축 행 스타일을 재사용한다. 금액 열과 필수 컬럼은 가로 스크롤로 유지한다.
- 우측 인사이트는 기본 닫힘이며 상단 버튼으로 연다. 복사·이동·집계 등은 추가 기능, 자동계산·환경설정은 계산 및 자동분개 접이식 영역에 유지한다. 접어도 컴포넌트를 해제하지 않아 입력 상태와 단축키 연결을 보존한다.
- UI 변경 파일: SalesJournalView.vue(내부 scoped 스타일), VoucherOperations.vue, VoucherEditorTools.vue, VoucherTypeTabs.vue, VoucherGridCell.vue. API·DB·회계 로직은 이번 변경에서 수정하지 않았다.
- sales-workbench.browser.mjs에 공통 제목 영역, 밀도 전환, 분개/인사이트 접기·펼치기, 접은 뒤 입력값 유지 확인을 추가했다.
- 테스트·타입검사·빌드·브라우저/E2E: **미실행 — 사용자 요청 시 실행**. 앞선 기능 구현의 통과 기록은 이번 UI 수정의 실행 결과가 아니다. 실제 화면 배치는 아직 브라우저에서 확인하지 않았다.


### UI 스타일 모듈 로딩 오류 수정

외부 `<style scoped src="./sales-journal.css">`가 개발 서버에서 `/_nuxt/@id/sales-journal.css?...`로 변환되어 HTTP 404를 반환했다. 페이지 파일은 존재하며 컴포넌트 스타일 의존성 로딩 실패였다. CSS를 SalesJournalView.vue의 내부 scoped 스타일로 이동하고 외부 파일은 제거했다. 수정 후 실제 개발 서버의 페이지 모듈·컴포넌트·CSS 응답은 모두 HTTP 200으로 확인했다. 단위 테스트·타입검사·빌드·브라우저/E2E는 미실행 — 사용자 요청 시 실행.
