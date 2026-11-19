-- 현재 상태 재확인: 대상 업체 계정 860건/적요 370건 존재, 원본 누락 0건. 재복사 불필요.
-- 아래 스크립트는 보관용입니다. 현재 상태 확인은 inspect-client-account-defaults.sql을 사용하세요.
-- 네네치킨 청라1호점 / 601-22-09320. 임시 테이블 없는 단일 SQL 문.
-- DB에는 미실행. DO부터 마지막 $seed$;까지 한 번에 실행합니다.
DO $seed$
DECLARE
  v_office_id constant uuid := '2dd26db6-92bd-4110-9e06-51f6e43b89cf';
  v_actor_id constant uuid := '08b755f3-1aa5-4813-a19a-7cfe9497d5a9';
  v_client_ids constant uuid[] := ARRAY['70b03d21-cf5d-4ac2-b479-06aff24385bc']::uuid[];
  v_inserted_ids bigint[];
  v_summary_count bigint;
BEGIN
  PERFORM set_config('lock_timeout','5s',true);
  LOCK TABLE public.clients, public.office_members, public.users,
    public.fi_account_default, public.fi_summary_default IN SHARE MODE;
  LOCK TABLE public.fi_account, public.fi_summary IN SHARE ROW EXCLUSIVE MODE;
  IF cardinality(v_client_ids)=0 OR array_position(v_client_ids, NULL) IS NOT NULL
     OR cardinality(v_client_ids) <> (SELECT count(DISTINCT id) FROM unnest(v_client_ids) AS x(id)) THEN
    RAISE EXCEPTION 'Specify a nonempty list of distinct client UUIDs.';
  END IF;
  IF (SELECT count(*) FROM public.clients WHERE office_id=v_office_id AND id=ANY(v_client_ids)) <> cardinality(v_client_ids) THEN
    RAISE EXCEPTION 'Client missing or belongs to a different office. No rows copied.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.clients c WHERE c.id=ANY(v_client_ids) AND c.status='ended') THEN
    RAISE EXCEPTION 'Ended client selected. Review target selection before initialization.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.office_members m JOIN public.users u ON u.id=m.user_id
    WHERE m.office_id=v_office_id AND m.user_id=v_actor_id
      AND m.status='ACTIVE' AND m.role IN ('OWNER','ADMIN')
      AND u.status='ACTIVE' AND u.deleted_at IS NULL
      AND (u.locked_until IS NULL OR u.locked_until <= now())
  ) THEN
    RAISE EXCEPTION 'Actor must be an active administrator of the selected office.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.fi_summary_default s
    LEFT JOIN public.fi_account_default a ON a.account_default_id=s.account_default_id AND a.deleted_at IS NULL
    WHERE s.deleted_at IS NULL AND a.account_default_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Active summary default references missing/deleted account default.';
  END IF;
  -- Do not recreate renamed or soft-deleted imported accounts on a rerun.
  IF EXISTS (
    SELECT 1 FROM public.fi_account a 
    JOIN public.fi_account_default d ON d.account_default_id=a.account_default_id AND d.deleted_at IS NULL
    WHERE a.client_id=ANY(v_client_ids) AND (a.deleted_at IS NOT NULL OR a.account_code <> d.account_code)
  ) THEN
    RAISE EXCEPTION 'Renamed/deleted imported account found; explicit reconciliation required.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.fi_summary s 
    WHERE s.client_id=ANY(v_client_ids) AND s.summary_default_id IS NOT NULL AND s.deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Deleted imported summary found; explicit reconciliation required.';
  END IF;
  -- Existing same-code accounts must originate from the same default.
  IF EXISTS (
    SELECT 1 FROM public.fi_account a 
    JOIN public.fi_account_default d ON d.account_code=a.account_code AND d.deleted_at IS NULL
    WHERE a.client_id=ANY(v_client_ids) AND a.deleted_at IS NULL AND a.account_default_id IS DISTINCT FROM d.account_default_id
  ) THEN
    RAISE EXCEPTION 'Existing account code has a different origin; manual reconciliation required.';
  END IF;
-- 1. Copy missing accounts only; retain edited rows and audit who inserted them.
WITH inserted AS (
  INSERT INTO public.fi_account
    (client_id, account_code, account_name, english_name,
     account_category_code, middle_category_code, account_nature_code,
     normal_balance, standard_fs_code, fx_method_code, is_business_vehicle,
     account_class_code, partner_balance_mode, is_active, is_locked, sort_order,
     account_default_id, submission_group_code_auto, print_name, created_by, updated_by)
  SELECT c.id, a.account_code, a.account_name, a.english_name,
     a.account_category_code, a.middle_category_code, a.account_nature_code,
     a.normal_balance, a.standard_fs_code, a.fx_method_code, a.is_business_vehicle,
     a.account_class_code, a.partner_balance_mode, a.is_active, a.is_locked, a.sort_order,
     a.account_default_id, a.submission_group_code, a.account_name, v_actor_id, v_actor_id
  FROM public.clients c CROSS JOIN public.fi_account_default a
  WHERE c.office_id=v_office_id AND c.id=ANY(v_client_ids) AND a.deleted_at IS NULL
  ON CONFLICT (client_id, account_code) WHERE deleted_at IS NULL DO NOTHING
  RETURNING account_id
)
SELECT COALESCE(array_agg(account_id), ARRAY[]::bigint[]) INTO v_inserted_ids FROM inserted;

-- 2. Set relationships ONLY on accounts inserted by this execution.

  IF EXISTS (
    SELECT 1 FROM public.fi_account dst

    JOIN public.fi_account_default d USING(account_default_id)
    LEFT JOIN public.fi_account rel ON rel.client_id=dst.client_id
      AND rel.account_code=d.related_account_code AND rel.deleted_at IS NULL
    WHERE dst.account_id=ANY(v_inserted_ids) AND d.related_account_code IS NOT NULL
      AND (rel.account_id IS NULL OR rel.account_id=dst.account_id)
  ) THEN RAISE EXCEPTION 'Missing or self-referencing related account. Initialization rolled back.'; END IF;

UPDATE public.fi_account dst SET related_account_id=rel.account_id, updated_at=now()
FROM public.fi_account_default d, public.fi_account rel
WHERE dst.account_id=ANY(v_inserted_ids) AND dst.account_default_id=d.account_default_id
  AND d.related_account_code=rel.account_code AND rel.client_id=dst.client_id
  AND rel.deleted_at IS NULL;

-- 3. Copy summaries; exact provenance matches are skipped on rerun.
-- Unexpected code/number conflicts raise a UNIQUE error and roll back everything.
INSERT INTO public.fi_summary
  (client_id, account_id, summary_default_id, summary_type_code,
   transaction_element_code, is_lookup_excludable, guide_text,
   summary_no, summary_code, summary_text, tax_effect_code,
   is_active, sort_order, created_by, updated_by)
SELECT a.client_id, a.account_id, s.summary_default_id, s.summary_type_code,
   s.transaction_element_code, s.is_lookup_excludable, s.guide_text,
   s.summary_no, s.summary_code, s.summary_text, s.tax_effect_code,
   s.is_active, s.sort_order, v_actor_id, v_actor_id
FROM public.fi_account a
JOIN public.fi_summary_default s ON s.account_default_id=a.account_default_id AND s.deleted_at IS NULL

WHERE a.client_id=ANY(v_client_ids) AND a.deleted_at IS NULL AND NOT EXISTS (
  SELECT 1 FROM public.fi_summary existing
  WHERE existing.client_id=a.client_id AND existing.account_id=a.account_id
    AND existing.summary_default_id=s.summary_default_id AND existing.deleted_at IS NULL
);

GET DIAGNOSTICS v_summary_count = ROW_COUNT;
RAISE NOTICE '계정과목 신규 %건, 적요 신규 %건', cardinality(v_inserted_ids), v_summary_count;
END;
$seed$;


