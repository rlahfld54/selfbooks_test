-- Executed in a transaction by migrate-partners.ts. Preserve office IDs and memberships.
ALTER TABLE public.tax_offices
  ADD COLUMN IF NOT EXISTS business_kind text,
  ADD COLUMN IF NOT EXISTS industry_code text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS address_detail text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_mobile text,
  ADD COLUMN IF NOT EXISTS partner_code text,
  ADD COLUMN IF NOT EXISTS managed_by_office_id uuid REFERENCES public.tax_offices(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS import_information jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS import_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS import_source_line integer,
  ADD COLUMN IF NOT EXISTS import_batch_id uuid,
  ADD COLUMN IF NOT EXISTS import_batch_hash text,
  ADD COLUMN IF NOT EXISTS imported_by uuid REFERENCES public.users(id) ON DELETE RESTRICT;

-- User-approved change: a number may occur with different industry details.
-- Identical tuples remain importable with review issues, as in the existing UI.
ALTER TABLE public.tax_offices DROP CONSTRAINT IF EXISTS tax_offices_business_registration_number_key;
CREATE INDEX IF NOT EXISTS tax_offices_partner_scope_idx ON public.tax_offices(managed_by_office_id);
CREATE INDEX IF NOT EXISTS tax_offices_partner_match_idx ON public.tax_offices
  (business_registration_number, industry_code, business_type, business_item);
CREATE UNIQUE INDEX IF NOT EXISTS tax_offices_import_retry_idx ON public.tax_offices
  (managed_by_office_id, import_batch_id, import_source_line) WHERE import_batch_id IS NOT NULL;
COMMENT ON COLUMN public.tax_offices.business_kind IS '사업자 구분: 1 개인, 2 법인. 기존 business_type은 업태';
COMMENT ON COLUMN public.tax_offices.managed_by_office_id IS '엑셀 등록 행의 관리 사무소. 서버 인증 범위에서 주입하며 소속 권한을 부여하지 않음';
COMMENT ON COLUMN public.tax_offices.import_information IS '엑셀 원문 및 추가 컬럼. 번호 형식 오류도 원문 보존';
ALTER TABLE public.tax_offices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tax_offices FROM PUBLIC, anon, authenticated;
