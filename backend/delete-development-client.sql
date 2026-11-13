-- One-time deletion for the development client 해솔문구.
-- Run the entire script in Supabase SQL Editor. Use ROLLBACK in place of COMMIT to preview.
BEGIN;

DO $$
DECLARE
  target_office CONSTANT uuid := '10000000-0000-4000-8000-000000000001';
  target_client CONSTANT uuid := '20000000-0000-4000-8000-000000000001';
BEGIN
  PERFORM 1 FROM public.clients
  WHERE office_id = target_office AND id = target_client AND client_name = '해솔문구'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION '삭제 대상 해솔문구를 찾을 수 없습니다';
  END IF;

  -- Keep voucher and period status stable until the transaction finishes.
  PERFORM 1 FROM public.fiscal_periods
  WHERE office_id = target_office AND client_id = target_client FOR UPDATE;
  PERFORM 1 FROM public.journal_entries
  WHERE office_id = target_office AND client_id = target_client FOR UPDATE;

  IF EXISTS (
    SELECT 1 FROM public.journal_entries AS entry
    JOIN public.fiscal_periods AS period
      ON (period.office_id, period.client_id, period.id) =
         (entry.office_id, entry.client_id, entry.fiscal_period_id)
    WHERE entry.office_id = target_office AND entry.client_id = target_client
      AND (entry.status IS DISTINCT FROM 'draft' OR period.status IS DISTINCT FROM 'open')
  ) THEN
    RAISE EXCEPTION '미확정 상태가 아니거나 열린 회계기간에 속하지 않는 전표가 있습니다';
  END IF;

  DELETE FROM public.member_notifications
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.member_recent_clients
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.business_verifications
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.establishment_service_profiles
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.workflow_items
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.evidence_documents
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.filing_cases
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.member_clients
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.journal_lines
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.sales_vouchers
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.journal_entries
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.fixed_asset_ledgers
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.fixed_assets
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.account_memos
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.business_partners
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.accounts
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.engagement_periods
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.fiscal_periods
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.establishment_info_versions AS version
  USING public.establishments AS establishment
  WHERE version.office_id = establishment.office_id
    AND version.establishment_id = establishment.id
    AND establishment.office_id = target_office
    AND establishment.client_id = target_client;

  DELETE FROM public.establishments
  WHERE office_id = target_office AND client_id = target_client;

  DELETE FROM public.clients
  WHERE office_id = target_office AND id = target_client;
END
$$;

COMMIT;
