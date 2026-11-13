-- 전제: public.users 테이블 생성 완료.
-- tax_offices / office_members가 아직 없는 DB에서 전체를 한 번 실행합니다.
-- 실제 사무소/소속 데이터는 별도로 입력합니다.
BEGIN;

CREATE TABLE public.tax_offices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL CHECK (btrim(name) <> ''),
    business_registration_number VARCHAR(10) UNIQUE
        CHECK (business_registration_number ~ '^[0-9]{10}$'),
    corporate_registration_number VARCHAR(13)
        CHECK (corporate_registration_number ~ '^[0-9]{13}$'),
    representative_name VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.office_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    office_id UUID NOT NULL REFERENCES public.tax_offices(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    role VARCHAR(20) NOT NULL DEFAULT 'STAFF'
        CHECK (role IN ('OWNER', 'ADMIN', 'STAFF')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (office_id, user_id)
);

CREATE INDEX office_members_user_id_idx ON public.office_members(user_id);

COMMENT ON TABLE public.office_members IS '사용자의 사무소 소속 및 권한';
COMMENT ON COLUMN public.office_members.role IS 'OWNER: 대표 / ADMIN: 관리자 / STAFF: 직원. 실제 권한 검사는 서버에서 구현';
COMMENT ON COLUMN public.tax_offices.business_registration_number IS '하이픈을 제외한 사업자등록번호 10자리';
COMMENT ON COLUMN public.tax_offices.corporate_registration_number IS '하이픈을 제외한 법인등록번호 13자리. 해당 없거나 미확인인 경우 NULL';

CREATE FUNCTION public.office_records_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'Record ID cannot be changed' USING ERRCODE = '23514';
    END IF;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := statement_timestamp();
    RETURN NEW;
END;
$$;

CREATE TRIGGER tax_offices_before_update
BEFORE UPDATE ON public.tax_offices
FOR EACH ROW EXECUTE FUNCTION public.office_records_before_update();

CREATE TRIGGER office_members_before_update
BEFORE UPDATE ON public.office_members
FOR EACH ROW EXECUTE FUNCTION public.office_records_before_update();

-- Fastify 경유 접근. 브라우저 직접 접근 정책은 별도 API 연동 시 설계합니다.
ALTER TABLE public.tax_offices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.tax_offices, public.office_members FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.office_records_before_update() FROM PUBLIC, anon, authenticated;

COMMIT;
