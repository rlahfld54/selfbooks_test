# Supabase 읽기 연동

- `public.clients.id`와 `public.tax_offices.id`는 UUID 기본 키입니다. `clients.office_id`가 `tax_offices.id`를 참조합니다.
- 수임업체 API는 `client_name`, `taxpayer_kind`, `status`를 사용합니다. `business_partners`는 별도 거래처 마스터입니다.
- 두 테이블의 RLS는 활성화돼 있으며 검증 시 등록된 정책은 없었습니다. 기존 접속 역할에는 `BYPASSRLS`가 있어 개발 API는 서버 설정에 명시한 샘플 사무소와 수임업체 UUID로 조회 범위를 제한합니다. 연결 역할에 적용되지 않는 정책이 해당 테이블에 있으면 디렉터리 조회를 거부합니다.
- 디렉터리 조회에는 파라미터 바인딩과 읽기 전용 트랜잭션을 사용합니다. API 응답에는 법인등록번호나 사업자등록번호를 포함하지 않습니다.
