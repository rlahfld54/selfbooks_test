# 자료수집 현황 (`/collection`)

2026-11-18 · 나나. 금요일(11/20) 데모용 1차 화면. 참고: 이지북스 「자료수집 집계」, 팀장님 tax-platform 자료수집(`apps/api/src/lib/hometax.ts` · `lib/collect.ts` · `front-simple` 자료수집현황), 셀프북스 화면모음 「자료수집 및 현황」.

## 화면

| 영역 | 내용 |
| --- | --- |
| 요약 | 수임 사업체 수 · 수집 완료 칸 · 실패 칸 · 한 번도 수집 안 한 사업체 |
| 조회 조건 | 업체명 · 사업자번호 · 대표자 검색, 담당자, 조회기간(기본: 올해 1월 1일 ~ 오늘) |
| 사업체 × 종류 표 | 기본정보(사업자 상태조회) + 매출 4종 + 매입 4종. 칸마다 완료 · 실패 · 건너뜀 · 미수집 · 대기 · 수집 중과 마지막 날짜 |
| 홈택스 자료수집 | 조회기간 · 자료 종류 · 사업체를 골라 시작. 홈택스 정보가 없는 사업체는 미리 경고 |
| 자료수집 진행 (화면 아래) | 진행 · 대기 · 완료 · 건너뜀 · 실패 수, 진행 막대, 경과 시간, 사업체별 작업 · 사유 · 걸린 시간, 재시도, 목록에서 숨기기, 최소화 · 닫기(끝난 뒤) |
| 사업체 패널 (행 클릭) | 오른쪽 패널, 탭 3개: 수집 현황(화면모음 요약) · 수집 자료(이지북스 홈택스 매입매출 자료) · 수집 이력. 위에 연도 · 전체/1기/2기 |

사이드바 ACCOUNTING 에 「자료수집」을 환경등록 다음에 추가했다(기존 `collection` 탭 · 경로 그대로).

## 수집 종류 (팀장님 스크랩 서버 KINDS 그대로)

| type | 이름 | 비고 |
| --- | --- | --- |
| `bizinfo` | 사업자 상태조회 | 국세청 공개 API. 홈택스 로그인 없음 |
| `tax` · `invoice` · `cash` · `cardzero` | 전자세금계산서 · 전자계산서 · 현금영수증 · 신용카드 매출 | 신용카드 매출은 분기별 월합계(`YYYY-MM`) |
| `ptax` · `pinvoice` · `pcash` · `pcard` | 전자세금계산서 · 전자계산서 · 현금영수증 · 신용카드 매입 | |

## 이지북스 맞춤 기능 (2026-11-18 추가)

| 이지북스 | 우리 화면 |
| --- | --- |
| 홈택스 자료수집 모달 — 인증 방식 · 수집 항목 · 조회 기간 · 기수집 안내 · 기간 전체 재수집 | `CollectionRunDialog`: 인증 방식 탭(세무대리 인증서는 「준비 중」), 항목별 조회기간(신용카드 매출은 분기 · 월합계), 기수집 안내(`collectedNotice`), 기간 전체 재수집(`full`) |
| 자료수집 진행 — 사용자 중단 | 진행 패널 「중단」, 상태 「중단됨」 |
| 회사 「자료수집 이력」 — 항목 필터 | 패널 「수집 이력」 탭 + 전체 항목 선택 |
| 「홈택스 매입매출 자료」 — 연도 · 전체/1기/2기 · 종류 목록 · 종류별 칸 · 합계 | 패널 「수집 자료」 탭 (`ROW_CATEGORIES` · `ROW_COLUMNS` · `halfPeriod` · `categoryTotals`) |

## 사업체별 자료수집 현황 (화면모음 v1-1 반영, 2026-11-18)

셀프북스 화면모음 v1-1 「자료수집현황」(f5)과 팀장님 `ScrapStatus.vue` · `GET /api/scrap/summary` 를 따라 패널 위에 붙였다.

- KPI 5개: 매출 수집건수 · 매출 수집금액(6종 합산), 매입 수집건수(통장 포함) · 매입 수집금액(통장 제외), 확인필요.
- 매출 6종 · 매입 5종 표: 공급가액 · 세액 · 합계 · 건수 · 기간 · 상태 · 조회. 숫자는 받아 온 자료에서 그때그때 센다(`companySummary`).
- 「조회」는 아래 수집 자료 목록을 그 종류로 바꾼다(설계의 「상세 리스트로 이동(연결 예정)」).
- 신용카드결제대행 · 기타결제대행은 신용카드 매출 응답(`prxCard` · `prxEtc`)에 같이 온다 — 상태는 신용카드 매출 작업을 따른다. 통장은 스크랩 API 에 경로가 없어 「미연동」, 합계를 내지 않고 대사 대상외(설계 bankException).
- 확인필요(전송대기+추천확인요)는 전표 전송 기능이 없어 「—」. 숫자를 만들지 않는다.
- 「홈택스 자료 대사」는 국세청 통합조회 미연동 안내만 띄운다(팀장님 `/scrap/reconcile` 501 과 같은 방침).

화면모음에 있지만 이번에 넣지 않은 것: 상단 「◀ 전기 / 차기 ▶」(전 메뉴 공통 규칙), 그리드 컬럼 보이기 · 순서 사용자 저장과 DEL 셀삭제(2026-09-23 요건), 「라이트/다크 → 인쇄 → 삭제」 공통 버튼 순서 — 공통 컴포넌트로 따로 만드는 편이 맞아 팀과 정한 뒤 붙인다.

## 지켜야 할 홈택스 규칙 (팀장님 스크랩 서버 가이드)

1. `BAD_CREDENTIALS` · `ACCOUNT_LOCKED` 는 **자동 재시도 금지**. 화면의 재시도는 사람이 누를 때만, `ACCOUNT_LOCKED` 는 막는다.
2. 같은 사업체를 **동시에 두 번 수집하지 않는다**. 이미 도는 사업체는 「이미 수집 중」으로 건너뛴다.
3. 응답에 `warning` 이 붙은 0건은 「자료 없음」이 아니라 **건너뜀**이다. 저장하지 않는다.
4. 홈택스 로그인이 실패하면 그 사업체의 남은 종류는 「이전 작업 인증 실패로 건너뜀」, 로그인 없는 사업자 상태조회는 그대로 진행한다.

## 구조

```text
pages/collection.vue → features/collection/CollectionStatusView.vue
  components/ CollectionRunDialog · CollectionProgressDock · CollectionRowsPanel
  composables/ useCollection (조회 · 시작 · 진행 polling · 재시도) · useCollectionSession (탭별 상태)
  services/ collection.ts (Fastify) · previewCollection.ts (샘플) · sampleRows.ts
  logic.ts (순수 계산) · types.ts · collection.css
```

- `pagesPreview` 이면 `previewCollection` 이 브라우저 안에서 수집을 흉내 낸다(실제 홈택스 미접속). 회사는 수임업체관리 샘플(수임 중 7곳)과 같다.
- 샘플 자료는 팀장님 `front-simple/app/demo/fixtures.json` 의 가상 회사(가온상사) 자료를 종류별 10건까지 줄인 것이다. 거래유형 · 계정과목처럼 판정이 들어간 값은 넣지 않았다.
- 시나리오: 바른카페(C003) 홈택스 정보 없음 → 로그인 실패 · 나머지 건너뜀, 주식회사 오션물류(C008) 전자계산서 매출 → 권한 부족 건너뜀.

## Fastify 1단계 (2026-11-18, 읽기 전용)

- `backend/src/routes/collection.ts` · `services/collection-repository.ts`, `app.ts` 에 등록(개발 · 서버 사무소 한정, partners 와 같은 조건).
- `GET /api/collection/status` — 공용 DB `public.clients`(사무소 전체, 지금 589곳)와 주 담당자(`client_assignments` PRIMARY → `users.name`)를 읽는다. 홈택스 계정 · 수집 테이블이 아직 없어 모든 칸은 「미수집」, 모든 업체는 「계정 미등록」.
- `GET /api/collection/rows` · `/history` — 빈 목록. `POST /runs` · `/cancel` · `/retry`, `GET /runs/:id` — 503 `COLLECTION_NOT_READY`(홈택스에 접속하지 않는다).
- 확인: 실제 DB 로 status 200 · 589곳 · 네네치킨 청라1호점(담당 회계법인 원지), runs 503. 백엔드 테스트 `tests/collection.test.ts` 2개 통과, `tsc --noEmit` 통과.
- 「준비 중」(수출실적명세서 · 화물운전자복지카드 · 신고서 · 세무대리 인증서)은 clients 와 무관하다 — 스크랩 API 에 경로가 없어서다.

## Fastify API 계약

응답은 기존과 같이 `{ data }`. 회사 범위는 서버가 인증 컨텍스트로 정하고, 클라이언트가 보낸 `clientIds` 는 허용 목록과 대조한다.

| 메서드 · 경로 | 요청 | 응답 `data` |
| --- | --- | --- |
| `GET /api/collection/status` | — | `{ companies: CollectionCompany[], sample: boolean }` |
| `POST /api/collection/runs` | `{ clientIds, kinds, from, to, full? }` | `CollectionRun` (작업 ID 를 먼저 돌려주고 뒤에서 돈다). `full` 이 아니면 종류별로 받은 마지막 날 이후만 |
| `GET /api/collection/runs/:id` | — | `CollectionRun` |
| `POST /api/collection/runs/:id/items/:itemId/retry` | `{}` | `CollectionRun` |
| `POST /api/collection/runs/:id/cancel` | `{}` | `CollectionRun` — 대기 작업만 `cancelled`(「사용자가 중단했습니다.」), 도는 종류는 끝까지 받는다 |
| `GET /api/collection/history?clientId` | — | `CollectionHistoryItem[]` — 최근 요청이 위 (이지북스 scrap-requests 와 같은 칸) |
| `GET /api/collection/rows?clientId&from&to` | — | `CollectedRow[]` |

타입은 `frontend/app/features/collection/types.ts` 가 정본이다. 스크랩 서버 주소 · 키는 서버 환경변수(`HOMETAX_API_URL` · `HOMETAX_API_KEY`, 팀장님 코드와 같은 이름)로만 둔다.

## 스크랩 API 정리 (팀장님 `api-guide.xlsx` · `api-biz-cert.xlsx`, 2026-11-18)

공통: `POST` + `Content-Type: application/json` + `X-API-Key`. 실패는 항상 `{ error, code? }`. **문서에 없는 경로는 부르지 않는다.**

| 경로 | 쓰임 | 핵심 |
| --- | --- | --- |
| `POST /session` | 아이디 · 비밀번호 로그인 → `sessionId`, `businesses[]` | `id` · `pw` 필수, `juminFront6` · `juminLast1` 계정에 따라, **다사업장 계정은 `bizNo` 필수**(빼면 에러 없이 `businesses[0]` 자료가 나온다). 약 1.2초, 무인 배치 가능 |
| `POST /simple-login/start` → `GET /simple-login/status` | 간편인증(카카오 기본 · toss · naver · payco · banksalad · kb · pass) | `name` · `birth`(YYYYMMDD) · `phone`. 2초 간격 · 최대 3분 폴링: STARTING · PENDING_APPROVAL · SUCCESS · MISMATCH · EXPIRED · ERROR. **폰 승인이 필요해 무인 배치 불가**, 다사업장 개인은 `bizNo` 를 로그인 때만 줄 수 있다 |
| `POST /trades/etax` | ①~④ 전자세금계산서 · 전자계산서 매출 · 매입 | `direction` sales/purchase, `docType` tax/plain, `from` · `to` **YYYYMMDD**, `all:true`(전 페이지), `withDetail:true` 면 수정분에 수정사유 · 품목 |
| `POST /trades/cash` | ⑤ 매입 · ⑥ 매출 현금영수증 | 3개월 넘으면 서버가 나눠 받는다 |
| `POST /trades/card` | ⑦ 매입(목록 + `deductSummary`) · ⑧ 매출(월별 집계) | ⑧ 은 `year` · `qFrom` · `qTo`(분기). 응답 `cardZeropay` · `prxCard`(판매대행 신용카드) · `prxEtc`(판매대행 기타) 각각 `{ total, monthly[{ stlYm, amt, scnt }] }` |
| `POST /biz-cert/session` | 사업자등록증명 | 아이디 · 비밀번호 세션만(간편인증 세션은 400). **기본값이 실제 민원 발급**이라 자동 수집엔 `basicOnly:true`(발급 없음, 주민번호 마스킹). 대표자 본인 계정만 · 법인 미검증. 옛 `/biz-cert` 는 410 |

세션: 유휴 25분, 쓰는 동안 안 죽는다 → **사업체(홈택스 계정)당 로그인 1회 → 조회 N회**. 같은 계정 동시 로그인 금지(앞 세션이 죽는다). 401(세션 만료)이면 재로그인 후 1회만 재시도.

에러 대응:

| HTTP · code | 뜻 | 화면 · 서버 처리 |
| --- | --- | --- |
| 401 `BAD_CREDENTIALS` | 아이디 · 비번 · 주민번호 불일치 | **자동 재시도 금지**, 남은 종류 건너뜀 |
| 423 `ACCOUNT_LOCKED` | 비번 5회 오류로 잠김 | 재시도 금지 · 재시도 버튼 막음, 고객이 비번 재발급 |
| 401 (code 없음) | 세션 만료 | 재로그인 후 1회 재시도 |
| 401 `NO_API_KEY` · `BAD_API_KEY` | 키 문제 | 전체 중단, 관리자 알림 |
| 400 `VALIDATION_ERROR` / code 없음 | 요청 오류 / 권한 없음 | 실패, `error` 문구 그대로 |
| 503 `maintenance:true` | 홈택스 점검 **KST 00~06시** | 06시 이후 재시도. 화면은 점검시간에 미리 경고(구현) |
| 503 `BROWSER_BUSY` · 502 `hometaxError` | 서버 혼잡 · 홈택스 오류 | 잠시 후 재시도 가능 |
| 응답에 `warning` | 권한 부족을 0건으로 돌려준 것 | **저장 금지 · 건너뜀**, `bizNo` 넣고 재로그인 |

자료 매핑에서 틀리기 쉬운 것(백엔드 매퍼 체크리스트):

1. 전자(세금)계산서 ①~④ 는 키 216개로 같다 → 매퍼 하나. 행에는 매입/매출 구분이 없으니 응답 최상위 `direction` · `docType` 에코를 쓴다. 문서 종류는 `etxivClsfCd`(세금계산서 · 수정세금계산서 · 계산서 · 수정계산서).
2. `tnmNm` = 항상 **거래 상대방**, `tnmNmB` = 항상 **본인**. 공급자 · 공급받는자 이름은 direction 을 보고 바꿔 넣는다. 사업자번호(`splrTxprDscmNo` · `dmnrTxprDscmNo`)는 방향과 무관하게 정확.
3. 금액은 숫자 필드로 계산(`sumSplCft` · `sumTxamt` · `totaAmt`), `...Str` 은 표시용.
4. 현금영수증 매입(`trsDtTime`) · 매출(`trsDtm`)은 필드 이름이 달라 매퍼를 나눈다. **취소(`trsClCd === "1"`)는 금액이 양수로 와서 제외해야 한다.** 승인번호 중복도 확인.
5. 신용카드 매입은 **취소가 음수 금액**으로 온다 → 거르지 말고 그대로 합산. 공제여부 `ddcYnNm` · `vatDdcClNm` 은 국세청 원본으로만 보관(판정 아님).
6. 신용카드 매출은 목록이 아니라 월합계(`YYYY-MM`). 기간 → 연도 · 분기로 바꿔 부른다.
7. 응답 필드가 바뀔 수 있으니 모르는 키에 깨지지 않게 파싱한다.
8. 개인정보: 원문 응답 · 주민번호 · 현금영수증 매출 구매자 이름을 로그에 남기지 않는다. 사업자등록증명은 `resnoOpen:false` 또는 `basicOnly:true`.

이번에 화면에 반영한 것: 결제대행 2종 연동(신용카드 매출 작업과 함께), 점검시간(KST 00~06) 경고, 신용카드 매출 안내 문구.

제안(미반영 · 팀 결정 필요):
- 홈택스 비밀번호가 없는 사업체(예: 바른카페)는 「간편인증으로 수집」 — 사람이 폰으로 승인해야 해서 버튼으로 1곳씩만, 예약 · 일괄 자동수집에는 못 쓴다.
- 기본정보를 국세청 공개 상태조회 대신 `/biz-cert/session` `basicOnly:true` 로 받으면 개업일 · 업태 · 종목 · 과세유형 · 관할서까지 채운다(로그인 필요, 대표자 계정만).
- 정해진 시각 자동수집(배치)은 06시 이후, 아이디 · 비밀번호 로그인 사업체만.

## 이지북스 실제 동작 (테스트 계정으로 확인, 2026-11-18)

팀장님 테스트 계정(`genietax_test_1`, 이지북스 로그인 — **홈택스 계정이 아니다**)으로 이지북스를 열어 본 결과. 화면은 보기만 했고 수집은 돌리지 않았다.

- 「자료수집 집계」(`/scrap-history`)는 **DB 만 읽는다** — `GET /api/scrap/summary?q&page&size` 한 번. 수집은 별도 「홈택스 자료수집」 모달이 하고 결과를 DB 에 쓴다. → 우리 `GET /api/collection/status` 도 DB 조회만 하면 된다.
- summary 응답: 회사마다 `cells[카테고리] = { state, lastSuccess, count }`. 카테고리: `DOC_BIZ_REG`(기본정보) · `PS`(매입매출 묶음) · `EXPORT_SALE` · `CARGO_CARD_CONFIRM` · `REPORT_VAT_TOTAL/RECEIPT/HELP` · `REPORT_INCOME_*` · `REPORT_WITHHOLD_*`.
- 회사 상세 「자료수집 이력」(`GET /api/companies/:seq/scrap-requests`): 요청마다 `category · loginType(idpw/cert) · status(done/error/cancelled) · periodStart · periodEnd · resultCount · resultSummary{테이블: 건수} · errorMsg · staffName · createdAt · finishedAt`.
- 매입매출(`PS`) 한 번이 7개 테이블에 나눠 쓴다: `HTAX_ETAX_SALE` · `HTAX_ETAX_PUR` · `HTAX_EINV_PUR`(계산서 매입) · `HTAX_CASH_SALE` · `HTAX_CASH_PUR` · `HTAX_CCRD_SALE`(카드 매출) · `HTAX_BCRD_PUR`(사업용카드 매입). 기본정보는 `HTAX_DOC_BIZ_REG`.
- 회사 정보에 `hometax_id` 와 `hometax_pw_registered`(비밀번호는 내려 주지 않고 등록 여부만)가 있다.
- 수집 모달: 인증 방식 「홈택스 계정」/「세무대리 인증서」, 「기간 전체 재수집」, 항목별 조회기간(매입매출 2024-01-01~오늘, 신고서 2023~2026년).

우리 DB 에 둘 것(제안 — 팀장님 「만들어야 할 테이블」 목록과 맞춘 뒤 마이그레이션):
1. `clients` 에 홈택스 아이디 · 비밀번호(암호화) · 주민번호 앞6/뒤1(암호화) — 화면에는 등록 여부만.
2. `collection_requests` — 위 scrap-requests 와 같은 칸(요청 1건 = 회사 1 × 종류 1).
3. 수집 자료 테이블 — 매입매출 7종(+계산서 매출) · 사업자등록증명.
4. 집계는 저장하지 않고 2 · 3 에서 센다.

## 미확정 사항

1. ~~스크랩 서버 주소 · 접속 키~~ — 2026-11-18 받음. 주소 `https://scrap.moneytax.co.kr`, 키는 루트 `.env` 의 `HOMETAX_API_KEY`(gitignore, 커밋 금지). 키 유효 확인: 빈 본문 `/session` → 400 `id 필수`, 틀린 키 → 401 `BAD_API_KEY`. 홈택스 계정 로그인은 아직 안 해 봤다(테스트 계정 필요).
2. 사업체별 홈택스 자격(아이디 · 비밀번호 · 주민번호 앞자리)을 어느 테이블에 어떻게(암호화) 둘지 — 현재 `clients` 에 없음. 세무대리인 인증서 방식으로 갈지도 미정.
3. 수집 결과 저장 테이블(`collection_runs` · `collection_run_items` · `collection_rows`) 마이그레이션 — DB 접속 정보를 받은 뒤 작성 · 적용.
4. 기본 조회기간을 신고기간(예정 · 확정)에 맞출지 — 세법 판단이라 지금은 「올해 1월 1일 ~ 오늘」.
5. 이지북스에 있는 수출실적명세 · 화물복지카드 · 신고서 · 접수증 · 지방세 수집은 팀장님 스크랩 서버 범위 밖이라 넣지 않았다.

## 검증 (2026-11-18)

- `npm test` (frontend): 90개 통과 (신규 `tests/collection.test.ts` 11개 포함).
- `npm run typecheck`: 통과.
- 브라우저(pagesPreview, 1600×1000 · 390×844): 표 표시, 사업체 3곳 선택 → 수집 시작 → 진행 → 완료(완료 18 · 건너뜀 8 · 실패 1), 행 클릭 → 수집 자료 패널, 콘솔 오류 없음.
- `npm run build`, 기존 브라우저 회귀 스크립트(`tests/*.browser.mjs`): 미실행 — 사용자 요청 시 실행.
- 실제 Fastify · DB · 스크랩 서버 연동: 미구현.
