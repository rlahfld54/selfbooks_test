# AAT 매입매출전표 확장 구현 — 2026-11-19

## 현재 상태

핵심 전표 업무를 기존 `/sales-journal`에 연결하고 실제 Supabase PostgreSQL 저장·복원을 검증했다. **요청서 전체의 세무사랑Pro 동등 기능 완료를 의미하지 않는다.** 아래 미구현·차이 항목을 남긴다.

이번 요청에 테스트 실행이 명시되어 단위 테스트, 타입검사, 빌드, DB 통합 및 브라우저 검증을 수행했다. 기존 사용자의 미커밋 화면·계정관리·작업공간 변경은 보존한다.

## 실제 DB 조사 및 적용

- 연결된 DB에 기존 코드가 참조하던 `accounts`, `journal_entries`, `journal_lines`, `sales_vouchers`, `fiscal_periods`, `establishments`, `business_partners`가 없었다. 이전 문서의 2026-11-10 DB 적용 기록은 현재 연결 DB와 일치하지 않는다.
- 사용자 후속 지시 “만들어줘”에 따라 기존 회사 계정 860개가 연결된 **네네치킨 청라1호점**을 재사용했다. 회사·사용자·기존 계정은 생성하거나 수정하지 않았다.
- 서버 회사: `70b03d21-cf5d-4ac2-b479-06aff24385bc`, 사무소: `2dd26db6-92bd-4110-9e06-51f6e43b89cf`.
- 본점 사업장과 2026-01-01~2026-12-31 열린 회계기간을 생성했다. 회사의 기존 `pending` 상태는 보존했으며 개발 전표 컨텍스트는 `active`/`pending`을 허용한다.
- 계정은 `fi_account`의 bigint ID를 문자열로 취급하며 재사용한다. 적요는 `fi_summary`에서 조회한다. 계정 마스터를 별도 UUID 테이블로 복제하지 않는다.
- `010_sales_base.sql` → `011_sales_workbench.sql` 순으로 **실제 적용 완료**. `db:migrate:sales`가 이 순서로 실행한다. 각 파일이 자체 트랜잭션이다.
- 모든 새 업무 테이블에 RLS를 적용하고 PUBLIC 권한을 제거했다. API는 인증 사무소 일치 및 서버 고정 회사·사업장을 검증한다. 프런트엔드 직접 DB 쓰기는 없다.
- 상세 품목과 입력 보조정보는 `sales_vouchers.details` JSONB에 보관한다. 분개는 공통 `journal_entries`/`journal_lines`에 한 번만 저장한다.
- `sales_voucher_audit`에 생성·수정·삭제·복원 전후 데이터와 사용자를 기록한다. 삭제 시 분개를 `deleted_lines`에 보관하고 활성 분개 행을 제거한다. 복원 시 열린 기간·버전·마스터를 다시 검사한다.

## 구현한 기능

| 영역 | 구현 |
|---|---|
| 전표 입력 | 기존 폼 유지, 선택 행 품목·유형·수량·단가·공급가액·세액·전자 셀 편집, 하단 분개 연결 |
| 유형 | 요청서의 26개 코드 정의. 15·21·55·56은 규칙 미확정으로 비활성. 영세·면세 세액 0 검증, 11/51 세액 0 확인, 54 불공제 사유, 카드유형 카드사 필수 |
| 정밀 계산 | BigInt 기반 소수 수량×단가, 원 단위 절사/반올림/올림, 10% 과세 세액, 포함금액 역산. 계산 버튼을 눌러 적용하므로 직접 수정한 금액은 자동 덮어쓰지 않음 |
| 자동분개 | 0 분개없음, 1 현금, 2 외상, 3 수동 혼합, 4 카드, 5 추가 상대계정. 회사 계정을 사용자가 연결. 기존 분개 재생성 확인 |
| 검증 | 차대 일치, 명시적 분개유형의 전표금액 일치, 복수품목 합계, 날짜·기간·회사 마스터·버전·상태 검증 |
| 거래처/계정 | 기존 검색 모달 재사용. 거래처 신규등록 API 및 화면, 계정 F2 검색, 계정별 적요 datalist. 주민번호 입력은 받지 않음 |
| 관리 | 단일/선택 다중 복사·이동, 전자/품목/전표적요 일괄변경 및 미리보기, 삭제·복원, 감사 이력, 동일 거래처 과거자료 |
| 검색/집계 | 기간·유형·전자/종이 필터, 상세 검색(번호/방향/거래처/사업자번호/품목/적요/금액범위/분개유형/대차불일치/중복), 중복 사유, 월/분기/조회기간 집계 및 유형 필터 이동 |
| 입력 환경 | 사용자별 탭 순서·숨김, 사용자/회사/사업장별 자동분개 계정·절사 설정을 브라우저에 저장 |
| 기타 | 하단 전표 고정, 선택 전표 인쇄 미리보기, CSV 수식 주입 방지, Excel 문자열 금액 내보내기, 조회범위 계정별 증감, 상단 패널 높이 조절·가로 스크롤·고정 선택 열 |

## API

기존 `/api/sales-journal` 경로를 확장했다. 요청서의 `/purchase-sales-vouchers`와 별도의 중복 API는 만들지 않았다.

| 메서드 | 경로 | 계약 |
|---|---|---|
| GET | `/sales-journal/meta` | 서버 회사·사업장 ID, 기간, 회사 계정·적요·거래처, VAT 유형 |
| GET | `/sales-journal` | 삭제되지 않은 해당 회사·사업장 전표와 분개 |
| POST / PUT | `/sales-journal`, `/sales-journal/:id` | 기존 계약 + electronic, quantity, unitPrice, journalType, cardCompany, evidenceNumber, nonDeductionReason, items |
| DELETE | `/sales-journal/:id?version=N` | 소프트 삭제 및 활성 분개 제외 |
| GET | `/sales-journal/deleted` | 삭제 전표와 보관 분개 |
| POST | `/sales-journal/:id/restore` | `{version}`; 원자적 복원 |
| GET | `/sales-journal/:id/history` | 해당 회사·사업장 전표 감사 이력 |
| POST | `/sales-journal/copy`, `/move` | `{selected:[{id,version}],changes:{date,periodId,memo?}}`, 최대 100건, 분개 포함 |
| POST | `/sales-journal/bulk` | 동일 selected, changes는 electronic/item/memo만 허용 |
| GET | `/sales-journal/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` | 유형·거래처·전자여부별 건수·공급가액·세액 |
| POST | `/sales-journal/partners` | `{name,code,businessNumber}`; 회사별 코드 유일, 주민번호 미지원 |

회사/사무소/사업장/작성자 ID는 저장 본문에서 받지 않는다. 전표 배치 작업은 안정된 ID 순서로 잠그고 한 트랜잭션에서 검증·반영한다. 신규 번호는 기존 `PS-UUID` 정책을 유지하고 재사용하지 않는다. 50001 일련번호와 sequence 테이블은 도입하지 않았다.

## 변경 파일

- DB: `backend/migrations/010_sales_base.sql`, `011_sales_workbench.sql`, `backend/src/db/migrate-sales.ts`, `backend/package.json`.
- 백엔드: `backend/src/app.ts`, `routes/sales.ts`, `services/sales-context.ts`, `sales-validation.ts`, `sales-repository.ts`, `sales-domain.ts`.
- 화면: `frontend/app/features/sales-journal/SalesJournalView.vue`, `VoucherEditorTools.vue`, `VoucherOperations.vue`, `VoucherTypeTabs.vue`, `VoucherGridCell.vue`, `VoucherSearchModal.vue`.
- 프런트 도메인/계약: 같은 기능 폴더의 `services/salesJournal.ts`, `voucherCalculation.ts`, `voucherSearch.ts`.
- 공통/검증 보정: `frontend/app/features/sales-journal/composables/useSalesJournal.ts`의 거래처 코드·사업자번호 검색 연결, `frontend/app/components/SearchDialog.vue`의 제목 옵션 및 샘플 표시 제거, `client-directory/services/clientDirectory.ts`의 누락된 샘플 nullable 필드, `backend/tests/api.test.ts`의 현재 사무소 조회 계약에 맞춘 테스트 수정.
- 테스트: `backend/tests/sales.test.ts`, `sales-workbench.integration.ts`, `frontend/tests/sales-workbench.test.ts`, `sales-workbench.browser.mjs`.
- 문서·추적: 본 문서, 관련 요구사항/API/DB 문서의 추가 링크, `.gitignore`의 새 SQL·통합 테스트·문서 예외.

## 검증

- 백엔드 단위/API 40/40 통과.
- 프런트엔드 단위 120/120 통과(카드매출 1,090,909,091 → 세액 109,090,909, 외상매입 1,100,000 분개, 소수 계산/절사, 미설정 계정, 혼합/분개없음, 복수품목·중복/집계 포함).
- 양쪽 타입검사·빌드 통과. Nuxt 빌드에 번들링 시간/주석 관련 경고가 있으나 실패는 없음.
- 실제 DB 통합 통과: 생성·조회·수정·복사·이동·삭제·복원·이력·오래된 버전 거부·배치 전체 롤백·다른 회사 차단·동시 번호 유일. 검증 UUID와 임시 거래처만 정리 완료.
- 브라우저 검증 통과: 2026-11-10 카드매출 1,090,909,091 입력, 세액 계산, 카드분개, 저장·새로고침, 유형 필터, 금액범위 상세 검색, F6/F11/Ctrl+F2. 1440px 및 390px 화면 캡처를 확인하고 표 최소 너비를 보정했다. 브라우저 테스트는 인증과 API를 모의 응답으로 대체하므로 실사용자 인증→브라우저→DB 전체 연결을 검증한 것은 아니다.

## 남은 구현과 업무 확인

1. 현재 저장 회사는 서버 고정이다. 상단 샘플 회사 전환을 실제 권한으로 사용하지 않는다. 다수 수임업체 전환·사업장 선택·결산월에 따른 기간 자동생성은 별도 연결이 필요하다.
2. Nuxt UI는 설치되어 있지 않아 기존 UiButton/UiModal/UiSelect를 재사용했다. 새 패키지를 임의 설치하지 않았다.
3. 모든 셀의 완전한 스프레드시트식 편집/방향키 행 전환, 가상화·서버 페이지네이션·열 너비 저장은 미구현이다. Tab/Shift+Tab, 선택 행 금액·품목 셀 Enter/Esc 및 좌우 끝 이동을 제공한다. 대량 데이터 성능 검증은 하지 않았다.
4. F8은 과거자료로 통일했다. 포커스별 적요·카드매출 전환, 전기분 전용 기간 UI, 과거자료 창에서 직접 복사, 복사 시 분개 제외 선택은 미구현이다.
5. 일괄 유형/분개유형 변경은 미구현이다. 금액과 분개를 함께 재생성하는 정책이 필요하다. 개별 전표 수정은 가능하다.
6. VAT 유형 마스터는 서버 TypeScript 정의이며 관리용 DB 테이블·활성화 화면은 아직 없다. 15·21·55·56, 특수 증빙 속성, 공제·불공제 신고 집계 규칙은 세무 검토 전 확정하지 않는다.
7. 가산세·의제·재활용 매입세액 계산 및 탭, 봉사료, 수정세금계산서, 전자 전송정보, 세금계산서 양식 인쇄, 외부 발행·신고는 미구현이다. 이들은 향후 별도 adjustment/evidence 모델로 연결해야 하며 일반 전표 금액으로 가장하지 않는다.
8. 자금관리에는 일반전표/기초잔액이 포함되지 않는다. 영구삭제는 제공하지 않는다. 운영용 권한과 보존기간·마감 후 복원 정책은 별도 확정이 필요하다.
9. 자동분개 계정/사용자 환경설정은 해당 브라우저 저장이다. 서버 공통 회사 설정, 다중 장치 동기화는 미구현이다.
10. 기존 legacy 입력(journalType 생략)은 기존 차대 일치 정책을 유지한다. 새 UI는 2 외상을 기본으로 전표금액 일치 검증을 적용한다. 음수 수정거래·분개없음 장부 반영 정책도 추가 업무 확인이 필요하다.

## 참고자료와 원본 차이

[뉴젠 공식 교육영상 페이지](https://newzensolution.co.kr/bbs/vodView.jsp?curPage=13&seq=322)는 2021-09-23 자료임을 확인했다. [개발 블로그](https://smartnewgen.tistory.com)는 과거 버전 자료이므로 현재 세법이나 키 배치를 확정하는 근거로 사용하지 않았다. 이번 첨부에는 요청 텍스트만 있어 원본 스크린샷과 픽셀 일치는 검증하지 않았다. 요청서의 업무 배치와 기존 AAT 스타일을 유지하며 로고·아이콘을 복제하지 않았다.


## 2026-11-19 일반전표 UI 통일

- 사용자 후속 요청으로 매입매출 화면을 일반전표의 PageToolbar, vouchers.css, 공통 Ui 컴포넌트 구성에 맞췄다. 파란 제목 띠와 고정 하단 작업바를 제거하고 흰색 제목 영역·조회 바·선택 전표/분개 접기·상태 표시줄로 통일했다.
- 일반전표와 작업 공간의 밀도 상태를 공유하며 32px 기본/27px 압축 행 스타일을 재사용한다. 금액 열과 필수 컬럼은 가로 스크롤로 유지한다.
- 우측 인사이트는 기본 닫힘이며 상단 버튼으로 연다. 복사·이동·집계 등은 추가 기능, 자동계산·환경설정은 계산 및 자동분개 접이식 영역에 유지한다. 접어도 컴포넌트를 해제하지 않아 입력 상태와 단축키 연결을 보존한다.
- UI 변경 파일: SalesJournalView.vue(내부 scoped 스타일), VoucherOperations.vue, VoucherEditorTools.vue, VoucherTypeTabs.vue, VoucherGridCell.vue. API·DB·회계 로직은 이번 변경에서 수정하지 않았다.
- sales-workbench.browser.mjs에 공통 제목 영역, 밀도 전환, 분개/인사이트 접기·펼치기, 접은 뒤 입력값 유지 확인을 추가했다.
- 테스트·타입검사·빌드·브라우저/E2E: **미실행 — 사용자 요청 시 실행**. 앞선 기능 구현의 통과 기록은 이번 UI 수정의 실행 결과가 아니다. 실제 화면 배치는 아직 브라우저에서 확인하지 않았다.


### UI 스타일 모듈 로딩 오류 수정

외부 `<style scoped src="./sales-journal.css">`가 개발 서버에서 `/_nuxt/@id/sales-journal.css?...`로 변환되어 HTTP 404를 반환했다. 페이지 파일은 존재하며 컴포넌트 스타일 의존성 로딩 실패였다. CSS를 SalesJournalView.vue의 내부 scoped 스타일로 이동하고 외부 파일은 제거했다. 수정 후 실제 개발 서버의 페이지 모듈·컴포넌트·CSS 응답은 모두 HTTP 200으로 확인했다. 단위 테스트·타입검사·빌드·브라우저/E2E는 미실행 — 사용자 요청 시 실행.
