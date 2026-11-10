# Supabase 읽기 연동

## 실행 방법

현재 프로젝트 루트의 `.env`에 Supabase PostgreSQL 연결과 조회 범위가 설정되어 있다. 프런트엔드에는 DB 비밀번호를 전달하지 않는다. 호출 경로는 Nuxt → Fastify → Supabase PostgreSQL이다.

프로젝트 루트에서 두 서버를 함께 실행한다. 종료는 `Ctrl+C` 한 번으로 처리한다.

```powershell
npm run dev
```

브라우저에서 `http://localhost:3000/client-directory`를 열거나 사이드바의 **수임업체관리**를 선택한다. `/clients`는 별도 샘플 거래처 화면이다. 백엔드 기본 포트는 4000, 프런트엔드는 3000이다.

연결만 확인하려면 서버를 별도로 켜지 않고 실행한다.

```powershell
npm --prefix backend run db:check
```

이 명령은 실제 Fastify 라우트를 통해 DB 상태 및 허용된 수임업체·사무소 조회를 검사한다. HTTP 상태와 레코드 수만 출력하며, 하나라도 실패하면 종료 코드 1을 반환한다. 레코드 수정이나 스키마 변경은 하지 않는다.

## 환경변수

| 위치 | 변수 | 용도 |
| --- | --- | --- |
| 루트 `.env` | `DIRECT_URL` | 현재 백엔드가 우선 사용하는 PostgreSQL URL |
| 루트 `.env` | `DATABASE_URL` | `DIRECT_URL`이 없을 때 사용하는 URL |
| 루트 `.env` | `DB_SSL_CA_PATH` | 프로젝트 루트 기준 인증서 파일 경로 |
| 루트 `.env` | `DEV_FIXTURE_OFFICE_ID` | 서버가 조회를 허용하는 개발용 사무소 UUID |
| 루트 `.env` | `DEV_FIXTURE_CLIENT_IDS` | 허용할 개발용 수임업체 UUID 목록, 쉼표 구분 |
| 루트 `.env` | `BACKEND_PORT`, `FRONTEND_ORIGIN` | 기본값 4000, `http://localhost:3000` |
| `frontend/.env` (선택) | `NUXT_PUBLIC_API_BASE` | 기본값 `http://localhost:4000/api`를 바꿀 때만 설정 |

접속 URL을 바꿀 때는 Supabase Connect 화면의 값을 사용한다. 상시 실행하는 서버와 IPv4 환경에서는 Session pooler를 사용할 수 있다. 인증서 검증은 활성화되어 있으며 `rejectUnauthorized: false`로 우회하지 않는다. [공식 연결 안내](https://supabase.com/docs/guides/database/connecting-to-postgres), [SSL 안내](https://supabase.com/docs/guides/platform/ssl-enforcement).

`.env`와 로컬 인증서는 Git 추적 대상에서 제외된다. 연결 정보는 채팅이나 프런트엔드 공개 설정에 복사하지 않는다.

## 확인 결과와 현재 범위

2026-11-09 기존 설정으로 실제 Supabase에 접속하여 `/api/health/db`, `/api/clients`, `/api/tax-offices`가 모두 200을 반환하는 것을 확인했다. 지정된 범위의 수임업체 2개, 사무소 1개를 조회했다. 백엔드 테스트 4개, 타입 검사와 빌드도 통과했다. 샌드박스 네트워크 제한 아래에서는 실패하여 외부 접속이 허용된 실행 환경에서 다시 검증했다.

현재는 로컬 개발용 **읽기 연동**이다. 등록·수정·삭제와 전표 저장, 운영 사용자 인증은 구현되어 있지 않다. 다른 업체를 추가로 조회하려면 서버의 개발용 조회 범위를 명시적으로 설정해야 한다. 화면의 데모 회사 선택으로 DB 조회 권한이 바뀌지 않는다.

## 스키마와 조회 정책

- `public.clients.id`와 `public.tax_offices.id`는 UUID 기본 키입니다. `clients.office_id`가 `tax_offices.id`를 참조합니다.
- 수임업체 API는 `client_name`, `taxpayer_kind`, `status`를 사용합니다. `business_partners`는 별도 거래처 마스터입니다.
- 두 테이블의 RLS는 활성화돼 있으며 검증 시 등록된 정책은 없었습니다. 기존 접속 역할에는 `BYPASSRLS`가 있어 개발 API는 서버 설정에 명시한 샘플 사무소와 수임업체 UUID로 조회 범위를 제한합니다. 연결 역할에 적용되지 않는 정책이 해당 테이블에 있으면 디렉터리 조회를 거부합니다.
- 디렉터리 조회에는 파라미터 바인딩과 읽기 전용 트랜잭션을 사용합니다. API 응답에는 법인등록번호나 사업자등록번호를 포함하지 않습니다.

## 2026-11-10 매입매출전표 저장 확장

수임업체 API는 읽기 전용을 유지하지만 매입매출전표 API는 실제 DB 쓰기를 지원한다. 기존 `fiscal_periods`, `accounts`, `business_partners`, `establishments`, `journal_entries`, `journal_lines` 구조를 조회 확인하고 재사용했다. 일반전표 UI는 여전히 데모다.

추가 테이블은 `backend/migrations/001_sales_vouchers.sql`의 `public.sales_vouchers`다. 기존 전표와 1:1이며 회사·사무소를 포함한 복합 FK를 사용한다. 거래유형, 거래처, 공급가액, 부가세, 품명, 결제방법, 확인요망 확인 시점, 생성/수정 사용자, 버전을 저장한다. RLS를 활성화하고 PUBLIC 권한을 제거한다. 로컬 개발 연결 역할의 접근 범위는 서버에서 제한하며 우회되는 RLS 정책이 있으면 조회/쓰기를 거부한다.

마이그레이션: `npm --prefix backend run db:migrate:sales` (개발 DB 전용, 트랜잭션·advisory lock 사용). 현재 연결된 테스트 DB에는 적용 완료했다.

개발 컨텍스트는 사용자 확인에 따라 `backend/src/services/sales-context.ts`에서 해솔문구 본점으로 고정한다. 해당 회사가 `DEV_FIXTURE_CLIENT_IDS` 허용 목록에 있어야 동작한다. 사용자 식별자는 `development-admin`이다. 향후 실제 인증 컨텍스트로 교체할 경계를 분리했다.

전표·상세·분개는 한 트랜잭션으로 저장/수정/삭제한다. 원전표와 상세는 수정 시 행 잠금, 기간 및 참조 마스터는 공유 잠금을 잡는다. `version`으로 오래된 수정/삭제 요청을 거부한다. 금액은 문자열→BigInt 검증 후 SQL 매개변수로 전달한다. 기존 마스터/전표 데이터를 자동 생성하거나 수정하지 않는다.
