-- Review before execution: grants ADMIN membership to the existing user in the configured office.
-- Prepared only; not executed. No Auth user or password changes.
BEGIN;
INSERT INTO public.office_members (office_id, user_id, role, status)
VALUES ('2dd26db6-92bd-4110-9e06-51f6e43b89cf', '08b755f3-1aa5-4813-a19a-7cfe9497d5a9', 'ADMIN', 'ACTIVE')
ON CONFLICT (office_id, user_id) DO NOTHING;
SELECT office_id, user_id, role, status FROM public.office_members
WHERE office_id='2dd26db6-92bd-4110-9e06-51f6e43b89cf' AND user_id='08b755f3-1aa5-4813-a19a-7cfe9497d5a9';
COMMIT;
