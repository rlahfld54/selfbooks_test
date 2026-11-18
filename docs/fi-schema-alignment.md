# 기존 수임업체에 맞춘 계정·적요 SQL

2026-11-18 실제 DB를 읽기 전용으로 조사하고 사용자 제공 복제 SQL과 비교했다. 아래 SQL은 작성만 했으며 적용하지 않았다.

## 차이

| 원본 SQL/스키마 | 현재 DB | 수정 |
| --- | --- | --- |
| biz_company, company_code 101/102 | 해당 테이블/코드 없음 | clients.id와 office_id로 명시적 선택 |
| fi_account/fi_summary.company_id bigint | clients.id UUID | client_id UUID로 변경 |
| created_by/updated_by bigint | users.id UUID | UUID와 사용자 FK |
| 계정·적요 간 참조 컬럼만 존재 | fi_* 외래키 없음 | 기본 원본 FK와 동일 업체 복합 FK |
| 관계계정 UPDATE가 기존 값도 변경 | 기존 편집 보호 필요 | 이번 실행에서 삽입한 계정만 관계 연결 |
| 모든 충돌을 ON CONFLICT DO NOTHING으로 숨김 | 다른 원본/같은 코드 혼동 가능 | 출처 확인, 예상 밖 충돌은 전체 롤백 |

실제 수임업체는 clients(589행 표시)이며 clients.office_id가 tax_offices.id를 참조한다. source_tax_office_id는 기존 수임업체 정보 원본과의 연결이다. tax_offices나 clients를 새로 생성하지 않는다.

실제 조회 시 fi_account/fi_summary는 각 0행, fi_account_default는 860행, fi_summary_default는 370행이었다. 기본 자료의 작성자/수정자는 모두 NULL, 기본 적요의 끊어진 계정 참조는 0건이었다. fi_*의 identity PK와 fi_account.submission_group_code 생성 컬럼을 확인했다.

## 파일과 실행 순서

1. backend/migrations/008_fi_existing_client_keys.sql
   - 비어 있는 회사별 테이블의 키를 기존 clients UUID에 맞추는 일회성 마이그레이션.
   - 잠금 후 빈 테이블 및 NULL audit 값 확인. 데이터가 생겼으면 중단한다.
   - 기본 자료·기존 수임업체·기존 사용자·identity·생성 컬럼·RLS를 보존한다.
   - 재실행하면 스키마 사전조건에서 중단한다.
2. backend/list-account-seed-clients.sql
   - 대상 업체의 client_id/office_id를 읽어 확인한다.
3. backend/seed-client-account-defaults.sql
   - seed_parameters의 office_id, actor_id, client_ids를 실제 UUID로 채운 뒤 파일 전체 실행.
   - NULL/빈 목록 상태로는 실행되지 않는다. 현재 요청에는 대상 업체가 명시되지 않아 채우지 않았다.
   - 동일 사무소 소속 수임업체 및 활성 관리자 사용자 여부 확인.
   - 원본 관계계정 누락, 다른 출처 계정코드 충돌, 이름이 아니라 코드가 변경된 원본 계정, 삭제된 복제 데이터는 자동 덮어쓰기/복원하지 않고 중단한다.
   - 같은 출처의 기존 계정·적요는 유지하고 누락된 항목만 추가한다. 예상 밖 적요 번호/코드 충돌은 전체 롤백한다.
   - 새 업체에 대한 정상 최초 복사 건수는 실행 시 삭제되지 않은 원본 수에 따라 결정된다.

SQL Editor에서 각 파일을 전체 트랜잭션 단위로 실행한다. 한 문장씩 선택 실행하지 않는다. 실행 실패 후 같은 연결을 계속 사용한다면 ROLLBACK으로 실패한 트랜잭션을 정리한다.

## 범위 및 남은 결정

- 이번 변경은 SQL 파일 작성이다. DB에는 적용하지 않았다.
- API와 화면은 기존 기본 계정 조회를 유지한다. 회사별 fi_account/fi_summary 조회·저장 연결은 별도 작업이다.
- 사무소/업체 범위는 서버에서 인증해야 한다. FK는 데이터 연결을 보장하며 접근 권한을 대신하지 않는다.
- RLS는 기존처럼 활성화, 정책 없음 상태를 유지한다. 브라우저 직접 쓰기 권한을 추가하지 않는다.
- transaction_element_code 1~8의 차변/대변 의미와 회계 규칙은 추측하지 않았다.
- 전체 589개 업체에 일괄 복제하지 않는다. 사용자가 정한 UUID 목록만 대상이다.
- 기존 회사별 자료에 bigint 회사/사용자 ID가 들어오면 별도 매핑 마이그레이션이 필요하다.

## 확인 상태

읽기 전용 스키마·FK·인덱스·트리거·RLS·건수·identity·생성 컬럼·기본 데이터 참조 확인 완료.
SQL 적용, 단위 테스트, 타입 검사, 빌드, DB 통합, 브라우저/E2E: **미실행 — 사용자 요청 시 실행**.

요청 시 검증 시나리오:
- 마이그레이션 전후 기본 자료 860/370행 보존.
- 다른 업체 계정으로 적요/관계계정 연결 시 FK 거부.
- 동일 대상 재복제 시 중복 추가/기존 값 변경 없음.
- 잘못된 사무소/사용자/업체 UUID 및 중복 대상 목록은 중단.
- 복제 도중 충돌 시 계정·관계·적요 전부 롤백.
- 회사별 기존 행/비NULL audit ID가 있는 DB에서 마이그레이션 중단.

## 2026-11-18 임시 테이블 의존 제거
반복된 seed_parameters 부재 오류에 대응해 복사 SQL을 단일 DO 블록으로 변경했다.
기존 seed_parameters/seed_targets/seed_inserted_accounts 임시 테이블은 사용하지 않는다.
대상 UUID는 DECLARE 변수에 들어 있으며 이번 삽입 계정 ID는 bigint 배열로 보관한다.
위 실행 안내의 seed_parameters 설정 및 BEGIN~COMMIT 지시는 이 변경으로 대체한다.
SQL Editor 새 쿼리에 파일 전체(DO $seed$부터 마지막 $seed$;까지)를 붙여넣어 실행한다.
새 버전 SQL 적용 및 실행 검증: 미실행 — 사용자 요청 시 실행.

## 현재 DB 재확인 결과
사용자가 v_inserted_ids relation 부재 오류를 보고한 뒤 실제 DB를 다시 조회했다.
- client_id 및 created_by/updated_by는 UUID로 변경되었고 외래키 적용 완료.
- 네네치킨 청라1호점의 deleted_at IS NULL 계정 860건, 적요 370건.
- 삭제되지 않은 기본 원본 대비 계정 누락 0, 적요 누락 0, 끊어진 회사별 적요 참조 0.
- fi_*의 사용자 정의 트리거 없음.
- 이번 작업은 조회만 했으며 복사를 실행하지 않았다. 기존 실행 중 어느 시점에 등록되었는지는 확인하지 않았다.
- 현 상태에서 복사 재실행은 불필요하다. backend/inspect-client-account-defaults.sql로 건수 조회 가능.
- v_inserted_ids는 로컬 SQL의 PL/pgSQL 배열 변수이지 테이블이 아니다. 보고된 오류의 정확한 발생문/실행 원문은 확보하지 못했으므로 스키마 부재나 부분 실행으로 단정하지 않는다.
