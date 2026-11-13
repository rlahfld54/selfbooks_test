-- 기존 tax_offices에 법인등록번호 컬럼을 추가합니다.
-- 수정된 003 생성 SQL로 이미 이 컬럼을 만들었다면 실행하지 않습니다.
BEGIN;

ALTER TABLE public.tax_offices
    ADD COLUMN corporate_registration_number VARCHAR(13)
    CHECK (corporate_registration_number ~ '^[0-9]{13}$');

COMMENT ON COLUMN public.tax_offices.corporate_registration_number
    IS '하이픈을 제외한 법인등록번호 13자리. 해당 없거나 미확인인 경우 NULL';

COMMIT;
