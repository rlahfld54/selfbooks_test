-- 009 자료수집 (공용 DB 에는 2026-11-18 에 008 이름으로 적용됨 — 내용 동일, 다시 실행해도 같다) 현황 — 업체별 홈택스 계정 · 수집 요청(이력) · 수집 자료
-- 새 테이블만 만든다. 기존 테이블은 건드리지 않는다. 여러 번 실행해도 같다.
-- 브라우저(anon · authenticated)는 직접 읽지 못한다 — RLS 를 켜고 정책을 두지 않으며 권한도 회수한다.
-- 백엔드(postgres)만 읽고 쓴다.

CREATE TABLE IF NOT EXISTS public.client_hometax_accounts (
  client_id uuid PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  office_id uuid NOT NULL REFERENCES public.tax_offices(id) ON DELETE RESTRICT,
  hometax_id text NOT NULL CHECK (char_length(hometax_id) BETWEEN 1 AND 50),
  -- AES-256-GCM 암호문(iv.tag.data, base64). 키는 서버 환경변수 HOMETAX_CRED_KEY
  password_enc text NOT NULL,
  jumin_front6_enc text,
  jumin_last1_enc text,
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.collection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.tax_offices(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  run_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('bizinfo', 'tax', 'invoice', 'cash', 'cardzero', 'ptax', 'pinvoice', 'pcash', 'pcard')),
  status text NOT NULL CHECK (status IN ('waiting', 'running', 'done', 'failed', 'skipped', 'cancelled')),
  period_from date NOT NULL,
  period_to date NOT NULL,
  login_type text NOT NULL DEFAULT 'idpw' CHECK (login_type IN ('idpw', 'cert')),
  result_count integer,
  code text,
  message text NOT NULL DEFAULT '',
  duration_ms integer,
  seq integer NOT NULL DEFAULT 0,
  requested_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS collection_requests_client_kind_idx ON public.collection_requests (client_id, kind, requested_at DESC);
CREATE INDEX IF NOT EXISTS collection_requests_run_idx ON public.collection_requests (run_id, seq);

CREATE TABLE IF NOT EXISTS public.collection_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES public.tax_offices(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('tax', 'invoice', 'cash', 'cardzero', 'cardagent', 'etcagent', 'ptax', 'pinvoice', 'pcash', 'pcard')),
  -- 홈택스 원본의 식별값(승인번호 · 일련번호 · 결제월). 같은 자료를 다시 받으면 덮어쓴다
  source_key text NOT NULL,
  -- YYYY-MM-DD, 월합계는 YYYY-MM
  row_date text NOT NULL,
  partner text NOT NULL DEFAULT '',
  partner_biz_no text NOT NULL DEFAULT '',
  partner_ceo text NOT NULL DEFAULT '',
  item text NOT NULL DEFAULT '',
  supply bigint NOT NULL DEFAULT 0,
  tax bigint NOT NULL DEFAULT 0,
  total bigint NOT NULL DEFAULT 0,
  note text NOT NULL DEFAULT '',
  deduct text,
  deal_type text,
  units integer,
  collected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, kind, source_key)
);
CREATE INDEX IF NOT EXISTS collection_rows_client_kind_date_idx ON public.collection_rows (client_id, kind, row_date);

ALTER TABLE public.client_hometax_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_rows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_hometax_accounts, public.collection_requests, public.collection_rows FROM anon, authenticated;
