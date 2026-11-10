# 매입매출전표 구현 기록

화면: 회계관리 → 매입매출전표입력, `/sales-journal`.

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
