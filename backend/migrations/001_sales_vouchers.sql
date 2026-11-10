-- Additive migration: existing journal entries and lines remain unchanged.
CREATE TABLE IF NOT EXISTS public.sales_vouchers (
  entry_id uuid PRIMARY KEY,
  office_id uuid NOT NULL,
  client_id uuid NOT NULL,
  partner_id uuid NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('11', '51')),
  item text NOT NULL DEFAULT '',
  supply numeric(15,0) NOT NULL CHECK (supply >= 0),
  vat numeric(15,0) NOT NULL CHECK (vat >= 0),
  payment text NOT NULL CHECK (payment IN ('외상', '현금', '예금', '카드', '기타')),
  zero_vat_confirmed_at timestamptz,
  created_by text NOT NULL,
  updated_by text NOT NULL,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (supply + vat > 0),
  CHECK (vat <> 0 OR zero_vat_confirmed_at IS NOT NULL),
  FOREIGN KEY (office_id, client_id, entry_id) REFERENCES public.journal_entries(office_id, client_id, id),
  FOREIGN KEY (office_id, client_id, partner_id) REFERENCES public.business_partners(office_id, client_id, id)
);
CREATE INDEX IF NOT EXISTS sales_vouchers_scope ON public.sales_vouchers(office_id, client_id);
ALTER TABLE public.sales_vouchers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_vouchers FROM PUBLIC;
