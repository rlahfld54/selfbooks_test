# 로컬 개발 API

## Supabase 인증 적용 (2026-11-13, 이전 인증 설명보다 우선)

- GET /api/auth/me → `{ data: { id, name, email, officeId, role } }`.
- `/api/health`와 CORS preflight를 제외한 등록된 API는 `Authorization: Bearer <access_token>`이 필요하다.
- 토큰 누락·만료는 401, 활성 관리자 소속 없음은 403, 인증 설정/연결 실패는 503이다.
- SUPABASE_URL 및 SUPABASE_PUBLISHABLE_KEY를 루트 .env에 설정한다. service_role 키는 사용하지 않는다.
- 회사·사무소 범위는 서버 설정을 유지하고, 실제 전표 생성·수정 사용자에는 검증된 Auth UUID를 사용한다.

## 사무소 정보 표시 (2026-11-13)

`GET /api/office-registration`은 서버 `DEV_FIXTURE_OFFICE_ID`의 사무소 상세 정보를 반환한다.
로컬 개발 모드에서만 제공하며 요청에서 사무소 ID를 받지 않는다. `clients` 테이블에 의존하지 않는다.
DB 누락/정책 우회는 503, 지정 사무소 없음은 404다. `/company`에서 표시하며 수정/검토 저장은 아직 탭 메모리다.
새 DB의 사무소 ID로 서버 설정을 갱신했다. 실제 인증 연결은 후속 작업이다.

기본 주소는 `http://localhost:4000/api`입니다. 아래 디렉터리·상태 라우트는 GET이며 성공 응답은 `{"data": ...}`, 오류 응답은 `{"error":{"code":"...","message":"..."}}` 형식입니다.

| 경로               | 성공 응답                                                                        |
| ------------------ | -------------------------------------------------------------------------------- |
| `/api/health`      | `{ status: "ok" }`                                                               |
| `/api/health/db`   | PostgreSQL에서 `SELECT 1` 실행 후 `{ status: "ok" }`                             |
| `/api/clients`     | 수임업체 배열. 각 행에는 `id`, `officeId`, `name`, `taxpayerKind`, `status`, `primaryAssignment` 포함. `primaryAssignment`는 DB 주담당의 `{ userId, name }` 또는 `null`이며 단일 업체 조회도 동일하다. |
| `/api/clients/:id` | UUID에 해당하는 수임업체 객체                                                    |
| `/api/tax-offices` | `id`, `name`을 가진 세무회계사무소 배열                                          |

잘못된 UUID는 400, 조회 범위에 없는 UUID는 404입니다. 허용되지 않은 로컬 요청은 403, DB 상태 확인 실패 또는 디렉터리 설정·권한 조건 미충족은 503을 반환합니다.

## 2026-11-10 매입매출전표 API

디렉터리 GET API와 별도로 다음 쓰기 API를 추가했다. 실행은 기존 `npm run dev`를 사용한다. 개발 모드에서만 활성화하며 운영 환경의 인증 우회는 차단한다.

| 메서드 | 경로 | 설명 |
| --- | --- | --- |
| GET | `/api/sales-journal/meta` | 서버 고정 회사·사업장, 회계기간, 거래처, 계정과목 |
| GET | `/api/sales-journal` | 해당 회사·사업장의 매입매출전표 및 분개 목록 |
| POST | `/api/sales-journal` | 신규 미확정 전표 저장 |
| PUT | `/api/sales-journal/:id` | 미확정 전표 수정 |
| DELETE | `/api/sales-journal/:id?version=N` | 미확정 전표 및 관련 분개 삭제 |

쓰기 요청은 허용된 로컬 Origin과 `Content-Type: application/json`이 필요하다. DELETE 본문은 `{}`로 전송한다. 성공은 `{ data: ... }`, 오류는 `{ error: { code, message } }` 형식을 유지한다.

POST/PUT 본문: `id`(신규 UUID, 재시도 시 동일 값), `version`(신규 0), `date`, `periodId`, `partnerId`, `type`(11/51), `item`, `supply`, `vat`, `payment`(외상/현금/예금/카드/기타), `memo`, `zeroVatConfirmed`, `lines` 배열. 각 분개는 `side`(debit/credit), `account`(계정 UUID), `amount`(정수 문자열), `memo`를 받는다. 회사/사용자/사업장/상태 필드는 받지 않는다.

서버가 차대 일치, 과세 유형 세액 0원 확인, 회사별 마스터 소속, 날짜와 열린 회계기간을 검증한다. 저장 결과에는 전표번호, 상태, 버전, `needsReview`, `zeroVatConfirmed`가 포함된다. 충돌/확정/마감은 409, 잘못된 입력은 400, 범위 밖 전표는 404, 설정 미비는 503이다. 전표번호는 회계기간 내 유일한 `PS-UUID`이며 일련번호 정책은 후속 확정 사항이다.

## 마이페이지 프로필 필드 확장
- GET /api/auth/me에 userCode, loginId, phone, departmentName, jobTitle, joinedAt을 추가한다.
- users.user_code/login_id, office_members.department_name/job_title/joined_at을 매핑한다.
- `/api/auth/me`의 `data.profile`은 `public.users` 원본 컬럼 16개를 포함한다(`password_hash` 제외). 기존 최상위 필드는 호환성을 위해 유지하며 로그인 및 복원 시 Pinia `authStore.user`에 저장한다.
- phone은 비어 있지 않은 users.mobile_phone을 우선하고 users.phone으로 대체한다.
- 화면 사용자 ID는 users.id에 해당하는 인증 UUID인 id를 사용한다. userCode는 선택적 관리 코드이며 사용자 식별자 표시에 사용하지 않는다.
- 기존 OWNER/ADMIN 인증 조건과 서버 지정 사무소 범위는 유지한다.
- 사용자 제공 스키마 기준으로 연결했으며 DB 변경과 INSERT 실행은 하지 않았다.
- 테스트·타입 검사·빌드·DB 통합·브라우저 검증: 미실행 — 사용자 요청 시 실행.

## POST /api/auth/login
기존 Bearer 필수 정책의 예외인 로그인 엔드포인트다. 로컬 Host/IP와 허용 Origin의 JSON POST 제한은 유지한다.

요청: { "identifier": "onegi 또는 이메일", "password": "비밀번호" }
성공: { "data": { "access_token": "...", "refresh_token": "..." } }

- 서버가 public.users의 login_id 정확 일치 또는 email 대소문자 무관 일치로 활성·미삭제·잠금 해제 계정을 조회한다. 복수 매칭이면 거부한다.
- 조회된 이메일로 Supabase /auth/v1/token?grant_type=password에 인증하고 Auth UUID와 users.id의 일치 및 기존 OWNER/ADMIN 소속을 재확인한다.
- 이메일 조회 전용 API는 제공하지 않는다. 비밀번호·토큰을 로그나 DB에 저장하지 않는다. 응답은 no-store다.
- 입력 오류 400, 계정/비밀번호 불일치 401, 관리자 소속 없음 403, 로그인 시도 제한 429, 인증 연결/설정 실패 503.
- 로컬 서버 인스턴스당 분당 30회 제한이며 재시작 시 초기화된다. 운영 분산 제한 구현은 이번 범위 밖이다.
- 브라우저는 Supabase auth.setSession으로 세션을 적용하고 기존 /auth/me 확인을 수행한다.
- 참고: https://supabase.com/docs/reference/javascript/auth-setsession
- 기존 SNS 전용 계정에 비밀번호를 자동 설정하지 않는다.

## GET /api/account-defaults
- 기존 Bearer 인증 및 로컬 접근 정책을 사용한다. 공통 마스터 public.fi_account_default에서 deleted_at IS NULL 행만 sort_order/account_code/account_default_id 순으로 반환한다.
- 응답: { data: [{ sourceId, code, name, englishName, categoryCode, subcategory, attribute, normalBalance, relatedAccount, statementCode, fxMethodCode, businessCar, isActive, isLocked }] }.
- bigint sourceId와 계정코드는 문자열, normalBalance는 D/C 원문이다. 개인정보/생성자/수정자 필드는 반환하지 않는다.
- 회사/사무소 입력 및 쓰기 메서드는 제공하지 않는다. 읽기 실패/설정 누락은 503 ACCOUNTS_UNAVAILABLE. Cache-Control: no-store.
- 테스트·타입 검사·빌드·DB 통합·브라우저/E2E: 미실행 — 사용자 요청 시 실행.

## GET /api/account-summaries
- 인증된 officeId에 속한 서버 지정 네네치킨 청라1호점의 회사별 적요 조회. 클라이언트 업체 ID는 받지 않는다.
- 응답 data: { client: { id, name }, summaries: [{ sourceId, code, summaryNo, name, typeCode, transactionElementCode, isActive, accountSourceId, accountDefaultId, accountCode, accountName }] }.
- bigint ID/계정·적요코드는 문자열이며 적요코드와 기본계정 ID는 null 가능.
- 업체 범위 불일치 403 CLIENT_ACCESS_DENIED, 조회 실패 503 SUMMARIES_UNAVAILABLE. Cache-Control: no-store.
- 수정/삭제/등록 API는 추가하지 않는다.


## 2026-11-19 매입매출전표 업무 확장

현재 DB 구조·저장 대상·추가 기능·검증·남은 범위는 [매입매출전표 확장 구현](sales-workbench.md)을 따른다. 이전 문서의 11/51 전용, 물리 삭제, 해솔문구 고정 회사 및 자동분개 미지원 설명은 이번 적용 범위에서 대체된다.
