-- Supabase SQL Editor에서 한 번 실행합니다.
-- user_profiles와 별개의 테이블이며 기존 테이블/데이터를 삭제하지 않습니다.
-- Supabase Auth 가입으로 생성된 UUID를 id에 전달합니다.
BEGIN;

CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
    login_id VARCHAR(50) NOT NULL UNIQUE,
    password_hash TEXT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED')),
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    failed_login_count INTEGER NOT NULL DEFAULT 0
        CHECK (failed_login_count >= 0),
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    CHECK (btrim(login_id) <> ''),
    CHECK (btrim(name) <> ''),
    CHECK (btrim(email) <> '')
);

COMMENT ON COLUMN public.users.id IS 'Supabase Auth가 발급한 auth.users.id';
COMMENT ON COLUMN public.users.password_hash IS '요청에 따라 확보한 컬럼. Supabase Auth 사용 중에는 NULL 유지. 비밀번호 원문 저장 금지';
COMMENT ON COLUMN public.users.email IS '로그인 이메일 사본. 인증 정보 변경 시 서버에서 동기화 필요';
COMMENT ON COLUMN public.users.failed_login_count IS '컬럼만으로 로그인 실패 집계나 잠금이 실행되지는 않음';

CREATE FUNCTION public.users_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id THEN
        RAISE EXCEPTION 'User ID cannot be changed' USING ERRCODE = '23514';
    END IF;
    NEW.created_at := OLD.created_at;
    NEW.updated_at := statement_timestamp();
    RETURN NEW;
END;
$$;

CREATE TRIGGER users_before_update
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.users_before_update();

-- 현재 Nuxt → Fastify → DB 구조에 맞춰 브라우저 직접 접근은 차단합니다.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.users FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.users_before_update() FROM PUBLIC, anon, authenticated;

COMMIT;
