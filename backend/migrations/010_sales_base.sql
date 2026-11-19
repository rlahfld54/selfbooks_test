-- Bootstrap missing voucher tables against the existing clients + fi_account masters.
BEGIN;
SET LOCAL lock_timeout='5s';
SELECT pg_advisory_xact_lock(604110011);
CREATE TABLE IF NOT EXISTS public.establishments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),office_id uuid NOT NULL,client_id uuid NOT NULL,name text NOT NULL,
 UNIQUE(office_id,client_id,id),FOREIGN KEY(office_id,client_id) REFERENCES public.clients(office_id,id)
);
CREATE TABLE IF NOT EXISTS public.fiscal_periods (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),office_id uuid NOT NULL,client_id uuid NOT NULL,period_label text NOT NULL,
 starts_on date NOT NULL,ends_on date NOT NULL,status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','closed')),
 CHECK(starts_on<=ends_on),UNIQUE(office_id,client_id,id),UNIQUE(office_id,client_id,starts_on,ends_on),
 FOREIGN KEY(office_id,client_id) REFERENCES public.clients(office_id,id)
);
CREATE TABLE IF NOT EXISTS public.business_partners (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),office_id uuid NOT NULL,client_id uuid NOT NULL,
 partner_name text NOT NULL,business_number varchar(10),partner_code text NOT NULL,
 UNIQUE(office_id,client_id,id),UNIQUE(office_id,client_id,partner_code),
 FOREIGN KEY(office_id,client_id) REFERENCES public.clients(office_id,id)
);
CREATE TABLE IF NOT EXISTS public.journal_entries (
 id uuid PRIMARY KEY,office_id uuid NOT NULL,client_id uuid NOT NULL,establishment_id uuid NOT NULL,fiscal_period_id uuid NOT NULL,
 entry_date date NOT NULL,entry_number text NOT NULL,description text NOT NULL DEFAULT '',status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','posted')),
 UNIQUE(office_id,client_id,id),UNIQUE(office_id,client_id,fiscal_period_id,entry_number),
 FOREIGN KEY(office_id,client_id,establishment_id) REFERENCES public.establishments(office_id,client_id,id),
 FOREIGN KEY(office_id,client_id,fiscal_period_id) REFERENCES public.fiscal_periods(office_id,client_id,id)
);
CREATE TABLE IF NOT EXISTS public.journal_lines (
 office_id uuid NOT NULL,client_id uuid NOT NULL,entry_id uuid NOT NULL,line_number integer NOT NULL,
 account_id bigint NOT NULL,partner_id uuid NOT NULL,memo text NOT NULL DEFAULT '',debit numeric(18,0) NOT NULL,credit numeric(18,0) NOT NULL,
 PRIMARY KEY(entry_id,line_number),CHECK((debit>0 AND credit=0) OR (credit>0 AND debit=0)),
 FOREIGN KEY(office_id,client_id,entry_id) REFERENCES public.journal_entries(office_id,client_id,id),
 FOREIGN KEY(client_id,account_id) REFERENCES public.fi_account(client_id,account_id),
 FOREIGN KEY(office_id,client_id,partner_id) REFERENCES public.business_partners(office_id,client_id,id)
);
CREATE TABLE IF NOT EXISTS public.sales_vouchers (
 office_id uuid NOT NULL,client_id uuid NOT NULL,entry_id uuid PRIMARY KEY,partner_id uuid NOT NULL,
 transaction_type text NOT NULL,item text NOT NULL DEFAULT '',supply numeric(15,0) NOT NULL CHECK(supply>=0),vat numeric(15,0) NOT NULL CHECK(vat>=0),
 payment text NOT NULL CHECK(payment IN ('외상','현금','예금','카드','기타')),zero_vat_confirmed_at timestamptz,
 created_by text NOT NULL,updated_by text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),version integer NOT NULL DEFAULT 1,
 CHECK(supply+vat>0),CHECK(version>0),UNIQUE(office_id,client_id,entry_id),
 FOREIGN KEY(office_id,client_id,entry_id) REFERENCES public.journal_entries(office_id,client_id,id),
 FOREIGN KEY(office_id,client_id,partner_id) REFERENCES public.business_partners(office_id,client_id,id)
);
CREATE INDEX IF NOT EXISTS journal_entries_date ON public.journal_entries(office_id,client_id,establishment_id,entry_date,id);
DO $security$ DECLARE relation text; BEGIN
 FOREACH relation IN ARRAY ARRAY['establishments','fiscal_periods','business_partners','journal_entries','journal_lines','sales_vouchers'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',relation);
 EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC',relation);
 END LOOP;
END $security$;
-- Explicit development target, existing company only; no changes to company status or accounts.
INSERT INTO public.establishments(id,office_id,client_id,name)
 SELECT '30000000-0000-4000-8000-000000000001',office_id,id,'본점' FROM public.clients
 WHERE id='70b03d21-cf5d-4ac2-b479-06aff24385bc' AND office_id='2dd26db6-92bd-4110-9e06-51f6e43b89cf'
 ON CONFLICT DO NOTHING;
INSERT INTO public.fiscal_periods(id,office_id,client_id,period_label,starts_on,ends_on)
 SELECT '40000000-0000-4000-8000-000000002026',office_id,id,'2026년','2026-01-01','2026-12-31' FROM public.clients
 WHERE id='70b03d21-cf5d-4ac2-b479-06aff24385bc' AND office_id='2dd26db6-92bd-4110-9e06-51f6e43b89cf'
 ON CONFLICT DO NOTHING;
COMMIT;
