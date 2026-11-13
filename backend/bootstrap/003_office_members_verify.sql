-- 위 생성 SQL 적용 후 SQL Editor에서 실행. 검증용 행은 모두 ROLLBACK합니다.
-- public.users에 사용자가 한 명 이상 있어야 합니다. 인증 계정은 생성하지 않습니다.
BEGIN;
DO $$
DECLARE
    test_user uuid;
    first_office uuid;
    second_office uuid;
    member_id uuid;
BEGIN
    SELECT id INTO test_user FROM public.users ORDER BY created_at, id LIMIT 1;
    IF test_user IS NULL THEN
        RAISE EXCEPTION 'Register a user before running this verification';
    END IF;

    INSERT INTO public.tax_offices(name) VALUES ('검증용 사무소 A') RETURNING id INTO first_office;
    INSERT INTO public.tax_offices(name) VALUES ('검증용 사무소 B') RETURNING id INTO second_office;
    INSERT INTO public.office_members(office_id,user_id,role)
    VALUES (first_office,test_user,'OWNER') RETURNING id INTO member_id;
    INSERT INTO public.office_members(office_id,user_id,role)
    VALUES (second_office,test_user,'ADMIN');
    UPDATE public.office_members SET status='INACTIVE' WHERE id=member_id;

    BEGIN
        INSERT INTO public.office_members(office_id,user_id) VALUES(first_office,test_user);
        RAISE EXCEPTION 'Duplicate membership was accepted';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        UPDATE public.office_members SET role='INVALID' WHERE id=member_id;
        RAISE EXCEPTION 'Invalid role was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE public.office_members SET status='INVALID' WHERE id=member_id;
        RAISE EXCEPTION 'Invalid status was accepted';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.office_members(office_id,user_id) VALUES(gen_random_uuid(),test_user);
        RAISE EXCEPTION 'Missing office was accepted';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        INSERT INTO public.office_members(office_id,user_id) VALUES(first_office,gen_random_uuid());
        RAISE EXCEPTION 'Missing user was accepted';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        DELETE FROM public.tax_offices WHERE id=first_office;
        RAISE EXCEPTION 'Referenced office was deleted';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    RAISE NOTICE 'PASS: membership creation, multi-office membership, status update, duplicate/role/status/FK/delete checks';
END $$;
ROLLBACK;
