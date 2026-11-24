-- 01. 공통 관리 UI의 서버 연동 준비용 스키마 보완
-- 실제 Supabase 구조 확인: 2026-11-23. 에이전트는 이 SQL을 실행하지 않았습니다.
-- Supabase SQL Editor에서 파일 전체를 한 번에 실행합니다.
-- 한 번만 적용하는 스크립트입니다. 이미 적용된 경우 오류로 전체 중단합니다.
-- 기존 직원/업체 생성, 상태 일괄 변경, 삭제, 기존 RLS/정책 변경은 하지 않습니다.
-- 아래 컬럼만으로 화면의 저장/사용 중지 기능이 생기지는 않습니다. API 연동은 후속 작업입니다.

BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

-- 현재 updated_at은 users, office_members, tax_offices에 자동 갱신 트리거가 있습니다.
-- clients에는 컬럼만 있고 트리거가 없으며 business_partners에는 시각 컬럼도 없습니다.
-- 기존 갱신 트리거/검토상태 초기화 트리거는 삭제하거나 교체하지 않습니다.
ALTER TABLE public.clients
  ADD COLUMN row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0);
ALTER TABLE public.office_members
  ADD COLUMN row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0);
ALTER TABLE public.users
  ADD COLUMN row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0);
ALTER TABLE public.tax_offices
  ADD COLUMN row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN deactivated_at timestamptz,
  ADD CONSTRAINT tax_offices_common_active_time_check
    CHECK (is_active = (deactivated_at IS NULL)),
  ADD CONSTRAINT tax_offices_common_protect_office_check
    CHECK (managed_by_office_id IS NOT NULL OR is_active);
ALTER TABLE public.business_partners
  ADD COLUMN row_version bigint NOT NULL DEFAULT 1 CHECK (row_version > 0),
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN deactivated_at timestamptz,
  ADD CONSTRAINT business_partners_common_active_time_check
    CHECK (is_active = (deactivated_at IS NULL));

CREATE FUNCTION public.common_ui_record_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Record ID cannot be changed' USING ERRCODE = '23514';
  END IF;
  NEW.created_at := OLD.created_at;
  NEW.row_version := OLD.row_version + 1;
  NEW.updated_at := statement_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER clients_common_ui_version
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.common_ui_record_before_update();
CREATE TRIGGER office_members_common_ui_version
BEFORE UPDATE ON public.office_members
FOR EACH ROW EXECUTE FUNCTION public.common_ui_record_before_update();
CREATE TRIGGER users_common_ui_version
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.common_ui_record_before_update();
CREATE TRIGGER tax_offices_common_ui_version
BEFORE UPDATE ON public.tax_offices
FOR EACH ROW EXECUTE FUNCTION public.common_ui_record_before_update();
CREATE TRIGGER business_partners_common_ui_version
BEFORE UPDATE ON public.business_partners
FOR EACH ROW EXECUTE FUNCTION public.common_ui_record_before_update();

REVOKE ALL ON FUNCTION public.common_ui_record_before_update() FROM PUBLIC;

COMMENT ON COLUMN public.clients.row_version IS
  '수정 충돌 검사용 버전. API는 WHERE row_version = 조회한 버전 조건으로 저장하고 0건이면 충돌 처리';
COMMENT ON COLUMN public.tax_offices.is_active IS
  '현재 /partners가 조회하는 관리 대상 행의 사용 여부. 관리 사무소 자체는 이 컬럼으로 중지할 수 없음';
COMMENT ON COLUMN public.business_partners.is_active IS
  '수임업체별 전표 거래처의 사용 여부. 과거 전표 참조는 보존하고 신규 선택만 API에서 제한';

COMMIT;

-- 적용 결과: 행 데이터나 개인정보를 출력하지 않습니다.
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('clients', 'office_members', 'users', 'tax_offices', 'business_partners')
  AND column_name IN ('row_version', 'is_active', 'deactivated_at', 'created_at', 'updated_at')
ORDER BY table_name, ordinal_position;
