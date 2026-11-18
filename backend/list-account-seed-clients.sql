-- 수임업체 조회: 대상 UUID를 확인하여 아래 복사 SQL의 설정에 넣으세요.
-- 임의 회사코드 101/102, client_name, 사업자번호로 업체를 추측하지 않습니다.
SELECT c.id AS client_id, c.office_id, c.client_name, c.status,
       c.source_tax_office_id
FROM public.clients c
ORDER BY c.office_id, c.client_name, c.id;
