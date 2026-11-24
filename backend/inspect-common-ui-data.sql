-- 03. 공통 관리 화면에 연결할 실제 데이터 조회
-- SELECT만 실행합니다. 01/02 적용 전에도 실행할 수 있습니다.
-- 대상 사무소를 제한하려면 각 params의 NULL::uuid를 '사무소 UUID'::uuid로 바꾸세요.
-- NULL이면 SQL Editor 관리자 권한으로 전체 사무소를 조회합니다.
-- 새 사용자/업체 데이터는 이미 있어 임의 INSERT를 제공하지 않습니다.

BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';

-- 1. 관련 테이블의 생성 여부와 RLS. proposed 2개는 아직 없을 수 있습니다.
WITH expected(table_name) AS (VALUES
  ('tax_offices'), ('clients'), ('users'), ('office_members'),
  ('client_assignments'), ('business_partners'), ('collection_requests'),
  ('client_info_snapshots'), ('management_change_log')
)
SELECT e.table_name,
       c.oid IS NOT NULL AS created,
       c.relrowsecurity AS rls_enabled
FROM expected e
LEFT JOIN pg_class c ON c.relname = e.table_name
  AND c.relnamespace = 'public'::regnamespace AND c.relkind = 'r'
ORDER BY e.table_name;

-- 2. 관리 사무소와 데이터 건수. 이 사무소 ID를 아래 필터에 사용할 수 있습니다.
SELECT o.id AS office_id, o.name AS office_name,
  (SELECT count(*) FROM public.clients c WHERE c.office_id = o.id) AS client_count,
  (SELECT count(*) FROM public.office_members m WHERE m.office_id = o.id) AS member_count,
  (SELECT count(*) FROM public.tax_offices t WHERE t.managed_by_office_id = o.id) AS managed_record_count,
  (SELECT count(*) FROM public.business_partners b WHERE b.office_id = o.id) AS voucher_partner_count
FROM public.tax_offices o
WHERE o.managed_by_office_id IS NULL
ORDER BY o.name, o.id;

-- 3. 수임업체. pending은 실제 저장 상태이며 조회 시 active로 바꾸지 않습니다.
WITH params AS (SELECT NULL::uuid AS office_id)
SELECT c.id, c.office_id, c.client_name, c.taxpayer_kind,
  c.business_registration_number, c.representative_name, c.address,
  c.status, c.engagement_start_date, c.engagement_end_date,
  c.source_tax_office_id, c.updated_at,
  (to_jsonb(c)->>'row_version')::bigint AS row_version,
  p.user_id AS primary_user_id, p.name AS primary_name
FROM public.clients c
CROSS JOIN params
LEFT JOIN LATERAL (
  SELECT a.user_id, u.name
  FROM public.client_assignments a JOIN public.users u ON u.id = a.user_id
  WHERE a.office_id = c.office_id AND a.client_id = c.id
    AND a.assignment_role = 'PRIMARY'
) p ON true
WHERE params.office_id IS NULL OR c.office_id = params.office_id
ORDER BY c.client_name, c.id;

-- 4. 직원 목록. 계정 상태와 사무소 소속 상태를 별도로 표시합니다.
-- password_hash, 인증 토큰, 홈택스 자격정보는 조회하지 않습니다.
WITH params AS (SELECT NULL::uuid AS office_id)
SELECT m.id AS membership_id, m.office_id, u.id AS user_id,
  u.name, u.login_id, u.email, u.phone, u.mobile_phone,
  u.status AS user_status, u.deleted_at,
  m.role, m.status AS membership_status, m.department_name, m.job_title,
  m.joined_at, m.updated_at AS membership_updated_at,
  (to_jsonb(m)->>'row_version')::bigint AS membership_version,
  (to_jsonb(u)->>'row_version')::bigint AS user_version,
  (SELECT count(*) FROM public.client_assignments a
   WHERE a.office_id = m.office_id AND a.user_id = m.user_id
     AND a.assignment_role = 'PRIMARY') AS primary_client_count,
  (SELECT count(*) FROM public.client_assignments a
   WHERE a.office_id = m.office_id AND a.user_id = m.user_id
     AND a.assignment_role = 'SECONDARY') AS secondary_client_count
FROM public.office_members m
JOIN public.users u ON u.id = m.user_id
CROSS JOIN params
WHERE params.office_id IS NULL OR m.office_id = params.office_id
ORDER BY m.office_id, m.role, u.name, u.id;

-- 5. 현재 /partners 화면이 사용하는 관리 대상 자료.
-- 관리 사무소 자체는 제외합니다. 실제 API는 현재 자기 사무소도 함께 조회하므로
-- 후속 수정/사용 중지 API에서 이 차이를 반드시 구분해야 합니다.
WITH params AS (SELECT NULL::uuid AS office_id)
SELECT t.id, t.managed_by_office_id AS office_id,
  t.partner_code, t.name, t.business_registration_number,
  t.representative_name, t.address, t.contact_name, t.contact_phone,
  t.contact_email, t.import_issues, t.updated_at,
  (to_jsonb(t)->>'is_active')::boolean AS is_active,
  (to_jsonb(t)->>'row_version')::bigint AS row_version,
  c.id AS client_id, c.status AS client_status
FROM public.tax_offices t
CROSS JOIN params
LEFT JOIN public.clients c
  ON c.office_id = t.managed_by_office_id AND c.source_tax_office_id = t.id
WHERE t.managed_by_office_id IS NOT NULL
  AND (params.office_id IS NULL OR t.managed_by_office_id = params.office_id)
ORDER BY t.name, t.id;

-- 6. 전표에서 참조하는 수임업체별 거래 상대방. 2026-11-23 조회 시 0건.
-- 위 589개 관리 대상을 여기에 일괄 복제하지 않습니다. client_id별 실제 거래처가 필요합니다.
WITH params AS (SELECT NULL::uuid AS office_id)
SELECT b.id, b.office_id, b.client_id, c.client_name,
  b.partner_code, b.partner_name, b.business_number,
  (to_jsonb(b)->>'is_active')::boolean AS is_active,
  (to_jsonb(b)->>'row_version')::bigint AS row_version
FROM public.business_partners b
JOIN public.clients c ON c.office_id = b.office_id AND c.id = b.client_id
CROSS JOIN params
WHERE params.office_id IS NULL OR b.office_id = params.office_id
ORDER BY b.office_id, b.client_id, b.partner_code;

-- 7. 실제 수집 작업 기록. 마지막 작업이 실패했다면 성공 시각과 구분합니다.
-- 이 기록은 대표자/주소 전체가 외부와 동일하다는 보장이 아닙니다.
WITH params AS (SELECT NULL::uuid AS office_id)
SELECT DISTINCT ON (r.office_id, r.client_id, r.kind)
  r.office_id, r.client_id, c.client_name, r.kind,
  r.status, r.requested_at, r.finished_at, r.result_count, r.code, r.message
FROM public.collection_requests r
JOIN public.clients c ON c.office_id = r.office_id AND c.id = r.client_id
CROSS JOIN params
WHERE params.office_id IS NULL OR r.office_id = params.office_id
ORDER BY r.office_id, r.client_id, r.kind, r.requested_at DESC, r.seq DESC;

COMMIT;
