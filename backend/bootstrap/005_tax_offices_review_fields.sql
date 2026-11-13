-- 앞선 대화의 원지 정보 테이블(public.tax_offices)에 화면 항목을 추가합니다.
-- 업체별 회사등록 정보라면 tax_offices가 아닌 별도 업체/사업장 설계가 필요합니다.
-- IF NOT EXISTS는 같은 이름의 컬럼을 건너뛰며 기존 타입을 검증/변경하지 않습니다.
-- 현재 화면의 자유 입력값을 저장하는 구조입니다. 세무 코드/규칙을 추정하지 않습니다.
BEGIN;

ALTER TABLE public.tax_offices
    ADD COLUMN IF NOT EXISTS business_type TEXT,
    ADD COLUMN IF NOT EXISTS business_item TEXT,
    ADD COLUMN IF NOT EXISTS co_representatives TEXT,
    ADD COLUMN IF NOT EXISTS representative_phone VARCHAR(20),
    ADD COLUMN IF NOT EXISTS head_office TEXT,
    ADD COLUMN IF NOT EXISTS branches TEXT,
    ADD COLUMN IF NOT EXISTS additional_workplaces TEXT,
    ADD COLUMN IF NOT EXISTS taxation_type TEXT,
    ADD COLUMN IF NOT EXISTS jurisdiction_tax_office TEXT,
    ADD COLUMN IF NOT EXISTS tax_contact_name TEXT,
    ADD COLUMN IF NOT EXISTS refund_bank_name TEXT,
    ADD COLUMN IF NOT EXISTS refund_account_number TEXT,
    ADD COLUMN IF NOT EXISTS refund_account_holder TEXT,
    ADD COLUMN IF NOT EXISTS business_memo TEXT,
    ADD COLUMN IF NOT EXISTS basic_info_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS representative_info_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS workplace_info_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS tax_info_reviewed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS memo_reviewed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tax_offices.business_type IS '업태';
COMMENT ON COLUMN public.tax_offices.business_item IS '종목';
COMMENT ON COLUMN public.tax_offices.co_representatives IS '공동대표자: 현재 화면의 자유 입력 내용';
COMMENT ON COLUMN public.tax_offices.representative_phone IS '대표자 연락처. 기존 phone은 사무소 대표 연락처';
COMMENT ON COLUMN public.tax_offices.head_office IS '본점 정보: 현재 화면의 자유 입력 내용';
COMMENT ON COLUMN public.tax_offices.branches IS '지점 정보: 현재 화면의 자유 입력 내용';
COMMENT ON COLUMN public.tax_offices.additional_workplaces IS '추가사업장 정보: 현재 화면의 자유 입력 내용';
COMMENT ON COLUMN public.tax_offices.taxation_type IS '과세유형: 코드 체계 미확정, 입력 내용 저장';
COMMENT ON COLUMN public.tax_offices.jurisdiction_tax_office IS '관할세무서';
COMMENT ON COLUMN public.tax_offices.tax_contact_name IS '세무정보 담당자 표시 이름. 접근 권한/직원 배정과 별개';
COMMENT ON COLUMN public.tax_offices.refund_bank_name IS '환급계좌 은행명';
COMMENT ON COLUMN public.tax_offices.refund_account_number IS '환급계좌 계좌번호: 선행 0 보존을 위해 문자열 저장';
COMMENT ON COLUMN public.tax_offices.refund_account_holder IS '환급계좌 예금주';
COMMENT ON COLUMN public.tax_offices.business_memo IS '업무메모';

-- 검토일시 NULL은 검토 대기. 확인 시 서버에서 시각을 저장해야 합니다.
-- 정보 수정 후 해당 분야의 확인 상태는 DB에서도 초기화합니다.
CREATE OR REPLACE FUNCTION public.reset_office_section_reviews()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
    IF ROW(NEW.name, NEW.business_registration_number, NEW.address, NEW.business_type, NEW.business_item)
       IS DISTINCT FROM
       ROW(OLD.name, OLD.business_registration_number, OLD.address, OLD.business_type, OLD.business_item) THEN
        NEW.basic_info_reviewed_at := NULL;
    END IF;
    IF ROW(NEW.representative_name, NEW.co_representatives, NEW.representative_phone)
       IS DISTINCT FROM ROW(OLD.representative_name, OLD.co_representatives, OLD.representative_phone) THEN
        NEW.representative_info_reviewed_at := NULL;
    END IF;
    IF ROW(NEW.head_office, NEW.branches, NEW.additional_workplaces)
       IS DISTINCT FROM ROW(OLD.head_office, OLD.branches, OLD.additional_workplaces) THEN
        NEW.workplace_info_reviewed_at := NULL;
    END IF;
    IF ROW(NEW.taxation_type, NEW.jurisdiction_tax_office, NEW.tax_contact_name,
           NEW.refund_bank_name, NEW.refund_account_number, NEW.refund_account_holder)
       IS DISTINCT FROM
       ROW(OLD.taxation_type, OLD.jurisdiction_tax_office, OLD.tax_contact_name,
           OLD.refund_bank_name, OLD.refund_account_number, OLD.refund_account_holder) THEN
        NEW.tax_info_reviewed_at := NULL;
    END IF;
    IF NEW.business_memo IS DISTINCT FROM OLD.business_memo THEN
        NEW.memo_reviewed_at := NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tax_offices_reset_section_reviews ON public.tax_offices;
CREATE TRIGGER tax_offices_reset_section_reviews BEFORE UPDATE ON public.tax_offices
FOR EACH ROW EXECUTE FUNCTION public.reset_office_section_reviews();
REVOKE ALL ON FUNCTION public.reset_office_section_reviews() FROM PUBLIC, anon, authenticated;
COMMIT;
