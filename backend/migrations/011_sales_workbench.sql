-- Existing sales_vouchers/journal_entries schema is required. No master data is replaced.
-- Run as a whole transaction, after reviewing against the target schema.
BEGIN;
SET LOCAL lock_timeout = '5s';
SELECT pg_advisory_xact_lock(604110010);
ALTER TABLE public.sales_vouchers
  ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by text,
  ADD COLUMN IF NOT EXISTS deleted_lines jsonb NOT NULL DEFAULT '[]'::jsonb;
-- Replace only the legacy type whitelist; retain all money/FK/status constraints.
DO $migration$
DECLARE constraint_row record;
BEGIN
  FOR constraint_row IN SELECT conname FROM pg_constraint
    WHERE conrelid='public.sales_vouchers'::regclass AND contype='c'
      AND pg_get_constraintdef(oid) LIKE '%transaction_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.sales_vouchers DROP CONSTRAINT %I',constraint_row.conname);
  END LOOP;
END $migration$;
ALTER TABLE public.sales_vouchers ADD CONSTRAINT sales_voucher_type_supported
  CHECK(transaction_type IN ('11','12','13','14','16','17','18','19','20','22','23','24','51','52','53','54','57','58','59','60','61','62'));
CREATE INDEX IF NOT EXISTS sales_vouchers_active_scope ON public.sales_vouchers(office_id,client_id,deleted_at);
CREATE TABLE IF NOT EXISTS public.sales_voucher_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  office_id uuid NOT NULL, client_id uuid NOT NULL, entry_id uuid NOT NULL,
  actor text NOT NULL, action text NOT NULL CHECK(action IN ('create','update','delete','restore')),
  before_data jsonb, after_data jsonb, created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(entry_id) REFERENCES public.journal_entries(id)
);
CREATE INDEX IF NOT EXISTS sales_audit_scope ON public.sales_voucher_audit(office_id,client_id,entry_id,id);
ALTER TABLE public.sales_voucher_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_voucher_audit FROM PUBLIC;
-- No company/account seed: actual account assignments must be selected from company masters.
COMMIT;
