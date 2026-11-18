-- 읽기 전용: 네네치킨 청라1호점 / 601-22-09320
SELECT c.client_name,
  (SELECT count(*) FROM public.fi_account a WHERE a.client_id=c.id AND a.deleted_at IS NULL) AS account_count,
  (SELECT count(*) FROM public.fi_summary s WHERE s.client_id=c.id AND s.deleted_at IS NULL) AS summary_count
FROM public.clients c
WHERE c.id='70b03d21-cf5d-4ac2-b479-06aff24385bc'::uuid
  AND c.office_id='2dd26db6-92bd-4110-9e06-51f6e43b89cf'::uuid;
