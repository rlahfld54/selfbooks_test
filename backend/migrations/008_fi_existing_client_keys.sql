-- SelfBooks: imported fi_* schema -> existing clients/users UUID keys.
-- Prepared from read-only inspection on 2026-11-18. NOT executed.
-- One-time migration. Execute the WHOLE file as the schema owner.
-- Preserves 860 account defaults / 370 summary defaults and all existing clients.
-- Does NOT initialize any client's accounts or grant browser write access.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

-- Prevent data arriving between the empty-table checks and type conversion.
LOCK TABLE public.fi_account_default, public.fi_summary_default,
           public.fi_account, public.fi_summary IN ACCESS EXCLUSIVE MODE;

DO $guard$
DECLARE t text; has_audit_values boolean;
BEGIN
  IF EXISTS (SELECT 1 FROM public.fi_account)
     OR EXISTS (SELECT 1 FROM public.fi_summary) THEN
    RAISE EXCEPTION 'Company tables are no longer empty. Stop: explicit bigint-to-client UUID mapping is required.';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name IN ('fi_account','fi_summary')
        AND column_name='company_id' AND data_type='bigint') <> 2 THEN
    RAISE EXCEPTION 'Unexpected schema or migration already applied: company_id bigint expected.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
      AND table_name='clients' AND column_name='id' AND data_type='uuid')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public'
      AND table_name='users' AND column_name='id' AND data_type='uuid') THEN
    RAISE EXCEPTION 'Expected existing clients.id/users.id UUID keys.';
  END IF;
  FOREACH t IN ARRAY ARRAY['fi_account_default','fi_summary_default','fi_account','fi_summary'] LOOP
    IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public'
        AND table_name=t AND column_name IN ('created_by','updated_by') AND data_type='bigint') <> 2 THEN
      RAISE EXCEPTION 'Unexpected audit column types in %', t;
    END IF;
    -- No conversion of a non-null foreign-system identifier is guessed.
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE created_by IS NOT NULL OR updated_by IS NOT NULL)', t)
      INTO has_audit_values;
    IF has_audit_values THEN
      RAISE EXCEPTION 'Non-null imported audit IDs in %. Explicit user mapping is required.', t;
    END IF;
  END LOOP;
END
$guard$;

ALTER TABLE public.fi_account RENAME COLUMN company_id TO client_id;
ALTER TABLE public.fi_summary RENAME COLUMN company_id TO client_id;
-- Safe only with the empty-table and all-null audit guards above.
ALTER TABLE public.fi_account ALTER COLUMN client_id TYPE uuid USING NULL::uuid;
ALTER TABLE public.fi_summary ALTER COLUMN client_id TYPE uuid USING NULL::uuid;
ALTER TABLE public.fi_account_default
  ALTER COLUMN created_by TYPE uuid USING NULL::uuid,
  ALTER COLUMN updated_by TYPE uuid USING NULL::uuid;
ALTER TABLE public.fi_summary_default
  ALTER COLUMN created_by TYPE uuid USING NULL::uuid,
  ALTER COLUMN updated_by TYPE uuid USING NULL::uuid;
ALTER TABLE public.fi_account
  ALTER COLUMN created_by TYPE uuid USING NULL::uuid,
  ALTER COLUMN updated_by TYPE uuid USING NULL::uuid;
ALTER TABLE public.fi_summary
  ALTER COLUMN created_by TYPE uuid USING NULL::uuid,
  ALTER COLUMN updated_by TYPE uuid USING NULL::uuid;

ALTER TABLE public.fi_account
  ADD CONSTRAINT fk_fi_account_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_fi_account_default FOREIGN KEY (account_default_id)
    REFERENCES public.fi_account_default(account_default_id) ON DELETE RESTRICT,
  ADD CONSTRAINT uq_fi_account_client_id UNIQUE (client_id, account_id),
  ADD CONSTRAINT fk_fi_account_related_client FOREIGN KEY (client_id, related_account_id)
    REFERENCES public.fi_account(client_id, account_id) ON DELETE RESTRICT;
ALTER TABLE public.fi_summary_default
  ADD CONSTRAINT fk_fi_summary_default_account FOREIGN KEY (account_default_id)
    REFERENCES public.fi_account_default(account_default_id) ON DELETE RESTRICT;
ALTER TABLE public.fi_summary
  ADD CONSTRAINT fk_fi_summary_client FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_fi_summary_client_account FOREIGN KEY (client_id, account_id)
    REFERENCES public.fi_account(client_id, account_id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_fi_summary_default FOREIGN KEY (summary_default_id)
    REFERENCES public.fi_summary_default(summary_default_id) ON DELETE RESTRICT;
DO $audit$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fi_account_default','fi_summary_default','fi_account','fi_summary'] LOOP
    EXECUTE format('ALTER TABLE public.%I
      ADD CONSTRAINT %I FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT,
      ADD CONSTRAINT %I FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE RESTRICT',
      t, 'fk_' || t || '_created_by', 'fk_' || t || '_updated_by');
  END LOOP;
END
$audit$;
ALTER INDEX public.ix_fi_account_company RENAME TO ix_fi_account_client;
ALTER INDEX public.ix_fi_summary_company RENAME TO ix_fi_summary_client;
COMMENT ON COLUMN public.fi_account.client_id IS '수임업체 public.clients.id. 서버에서 사무소 접근 권한 검증 후 사용.';
COMMENT ON COLUMN public.fi_summary.client_id IS '수임업체 public.clients.id. 연결 계정과 동일 수임업체여야 함.';
-- Keep identity PKs, generated submission_group_code, indexes, checks and RLS.
-- No company initialization, browser grants or new RLS policies in this migration.
COMMIT;
