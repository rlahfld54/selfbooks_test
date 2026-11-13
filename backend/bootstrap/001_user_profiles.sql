-- 새 Supabase 프로젝트의 SQL Editor에서 한 번 실행합니다.
-- auth.users는 Supabase Auth가 관리합니다. 직접 생성하지 않습니다.
-- 사용자 데이터는 삽입하지 않습니다.
BEGIN;

CREATE TABLE public.user_profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
    name TEXT NOT NULL CHECK (btrim(name) <> ''),
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_profiles IS 'Supabase 인증 사용자에 연결한 업무 프로필';
COMMENT ON COLUMN public.user_profiles.user_id IS '회원가입으로 발급된 auth.users.id를 그대로 저장';
COMMENT ON COLUMN public.user_profiles.status IS '업무 접근 상태. 서버에서 매 요청 시 확인 필요';

CREATE FUNCTION public.set_user_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    NEW.user_id := OLD.user_id;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := statement_timestamp();
    RETURN NEW;
END;
$$;

CREATE TRIGGER user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_user_profiles_updated_at();

-- Fastify 서버 경유 방식. 브라우저의 직접 조회/수정은 아직 허용하지 않습니다.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.user_profiles FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_user_profiles_updated_at() FROM PUBLIC, anon, authenticated;

COMMIT;
