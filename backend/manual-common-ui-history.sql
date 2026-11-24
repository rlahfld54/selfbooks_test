-- 02. 외부 정보 비교/사용자 선택 적용 및 관리 변경 이력
-- 01(manual-common-ui-schema.sql) 이후, 해당 기능을 준비할 때 실행합니다.
-- 신규 테이블 2개만 생성하며 기존 자료를 복사하거나 임의 샘플을 INSERT하지 않습니다.
-- 외부 조회 결과의 검증, 권한 확인, 변경 적용, 이력 기록은 후속 Fastify API가 담당합니다.
-- 스크래핑을 실행하거나 업체 정보를 자동 덮어쓰는 트리거는 없습니다.
-- 한 번만 적용합니다. 파일 전체를 Supabase SQL Editor에서 실행합니다.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- 01이 실제 적용되어 있어야 합니다. 누락 시 생성 전에 오류로 중단합니다.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clients'
      AND column_name = 'row_version' AND data_type = 'bigint'
  ) THEN
    RAISE EXCEPTION 'manual-common-ui-schema.sql을 먼저 적용하세요.';
  END IF;
END;
$$;

-- 외부에서 확인한 업체 기본정보 후보를 현재 clients와 비교합니다.
-- 직원 정보·권한·수임 상태는 외부 정보가 덮어쓸 수 있는 필드가 아닙니다.
CREATE TABLE public.client_info_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.tax_offices(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL,
  source text NOT NULL CHECK (source = 'hometax'),
  fetched_at timestamptz NOT NULL,
  requested_by uuid NOT NULL,
  base_client_version bigint NOT NULL CHECK (base_client_version > 0),
  before_data jsonb NOT NULL CHECK (jsonb_typeof(before_data) = 'object'),
  candidate_data jsonb NOT NULL CHECK (jsonb_typeof(candidate_data) = 'object'),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'applied', 'dismissed')),
  applied_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_info_snapshots_scope_id_key UNIQUE (office_id, client_id, id),
  CONSTRAINT client_info_snapshots_scope_fk
    FOREIGN KEY (office_id, client_id)
    REFERENCES public.clients(office_id, id) ON DELETE RESTRICT,
  CONSTRAINT client_info_snapshots_requester_fk
    FOREIGN KEY (office_id, requested_by)
    REFERENCES public.office_members(office_id, user_id) ON DELETE RESTRICT,
  CONSTRAINT client_info_snapshots_decider_fk
    FOREIGN KEY (office_id, decided_by)
    REFERENCES public.office_members(office_id, user_id) ON DELETE RESTRICT,
  CONSTRAINT client_info_snapshots_allowed_before_check CHECK (
    before_data - ARRAY['client_name', 'business_registration_number', 'representative_name', 'address']::text[] = '{}'::jsonb
  ),
  CONSTRAINT client_info_snapshots_allowed_candidate_check CHECK (
    candidate_data - ARRAY['client_name', 'business_registration_number', 'representative_name', 'address']::text[] = '{}'::jsonb
  ),
  CONSTRAINT client_info_snapshots_applied_fields_check CHECK (
    applied_fields <@ ARRAY['client_name', 'business_registration_number', 'representative_name', 'address']::text[]
    AND array_position(applied_fields, NULL) IS NULL
    AND candidate_data ?& applied_fields
  ),
  CONSTRAINT client_info_snapshots_decision_check CHECK (
    (state = 'pending' AND decided_by IS NULL AND decided_at IS NULL AND cardinality(applied_fields) = 0)
    OR (state = 'applied' AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND cardinality(applied_fields) > 0)
    OR (state = 'dismissed' AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND cardinality(applied_fields) = 0)
  )
);
CREATE INDEX client_info_snapshots_scope_time_idx
  ON public.client_info_snapshots (office_id, client_id, fetched_at DESC);
CREATE INDEX client_info_snapshots_pending_idx
  ON public.client_info_snapshots (office_id, client_id, created_at DESC)
  WHERE state = 'pending';

-- 전표 이력(sales_voucher_audit)과 목적이 다르므로 관리 변경 이력을 분리합니다.
-- target_id는 대상 종류가 여러 개이므로 단일 FK가 아닙니다.
-- API가 대상 행의 사무소 범위·활성 권한을 검사한 뒤 저장과 같은 트랜잭션에서 기록해야 합니다.
CREATE TABLE public.management_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.tax_offices(id) ON DELETE RESTRICT,
  actor_user_id uuid NOT NULL,
  target_table text NOT NULL CHECK (target_table IN ('clients', 'office_members', 'users', 'tax_offices', 'business_partners', 'client_assignments')),
  target_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'deactivate', 'reactivate', 'assign', 'apply_snapshot')),
  before_data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(before_data) = 'object'),
  after_data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(after_data) = 'object'),
  snapshot_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT management_change_log_actor_fk
    FOREIGN KEY (office_id, actor_user_id)
    REFERENCES public.office_members(office_id, user_id) ON DELETE RESTRICT,
  CONSTRAINT management_change_log_snapshot_action_check
    CHECK ((action = 'apply_snapshot') = (snapshot_id IS NOT NULL)),
  CONSTRAINT management_change_log_snapshot_target_check
    CHECK (snapshot_id IS NULL OR target_table = 'clients'),
  CONSTRAINT management_change_log_snapshot_scope_fk
    FOREIGN KEY (office_id, target_id, snapshot_id)
    REFERENCES public.client_info_snapshots(office_id, client_id, id) ON DELETE RESTRICT
);
CREATE INDEX management_change_log_scope_target_idx
  ON public.management_change_log (office_id, target_table, target_id, created_at DESC);

ALTER TABLE public.client_info_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.management_change_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.client_info_snapshots, public.management_change_log FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.client_info_snapshots, public.management_change_log FROM service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.client_info_snapshots TO service_role;
GRANT SELECT, INSERT ON TABLE public.management_change_log TO service_role;
-- 현재 확인한 postgres/service_role은 BYPASSRLS입니다. anon/authenticated용 정책은 만들지 않습니다.

COMMENT ON TABLE public.client_info_snapshots IS
  '외부에서 조회한 clients 기본정보 비교 후보. fetched_at은 실제 외부 조회 시각이며 서버 캐시 재조회 시각이 아님. 값 검증/낙관적 잠금/선택 적용은 API에서 처리';
COMMENT ON TABLE public.management_change_log IS
  '관리 변경 이력. 비밀번호, password_hash, 암호화된 홈택스 자격, 주민번호, 인증 토큰은 저장 금지. API는 업무 필드만 선별해서 기록';
COMMENT ON COLUMN public.management_change_log.target_id IS
  '대상 PK. client_assignments의 경우 client_id를 사용하고 before/after에 user_id와 assignment_role을 기록';

COMMIT;

SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('client_info_snapshots', 'management_change_log');
