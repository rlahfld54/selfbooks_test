-- Supabase SQL Editor에서 파일 전체를 한 번에 실행하세요.
-- DO $ ~ END $;가 하나의 원자적 등록 구문입니다. 내부 일부만 실행하지 마세요.
-- 먼저 아래 7개 이메일의 Supabase Auth 계정을 생성해야 합니다.
-- 김원지는 등록하지 않습니다. 윤가은은 초대 대기 대용으로 INACTIVE 처리합니다.
-- 다른 업체 배정은 하지 않으며 네네치킨 주담당자는 onegi로 설정합니다.
DO $$
DECLARE
  target_office uuid := '2dd26db6-92bd-4110-9e06-51f6e43b89cf';
  target_client uuid := '70b03d21-cf5d-4ac2-b479-06aff24385bc';
  owner_id uuid;
  missing_emails text;
BEGIN
CREATE TEMP TABLE staff_to_register (
  name text, login_id text, email text, department_name text,
  job_title text, status text, joined_date date
) ON COMMIT DROP;

INSERT INTO staff_to_register VALUES
('이수현','suhyun.lee','suhyun@aat-demo.example','세무1팀','팀장','ACTIVE','2025-03-04'),
('박민준','minjun.park','minjun@aat-demo.example','세무1팀','세무대리','ACTIVE','2025-04-11'),
('최지연','jiyeon.choi','jiyeon@aat-demo.example','세무2팀','팀장','ACTIVE','2025-02-18'),
('정하늘','haneul.jung','haneul@aat-demo.example','세무2팀','세무대리','ACTIVE','2025-06-12'),
('오세진','sejin.oh','sejin@aat-demo.example','세무2팀','사원','ACTIVE','2025-08-07'),
('한도윤','doyun.han','doyun@aat-demo.example','관리팀','매니저','ACTIVE','2025-10-10'),
('윤가은','gaeun.yoon','gaeun@aat-demo.example','세무1팀','사원','INACTIVE','2026-11-10');

  -- 실행 도중 기존 계정이나 담당 연결이 변경되지 않도록 잠급니다.
  LOCK TABLE public.users, public.office_members, public.client_assignments
    IN SHARE ROW EXCLUSIVE MODE;

  SELECT u.id INTO STRICT owner_id
  FROM public.users u JOIN public.office_members m ON m.user_id=u.id
  WHERE u.login_id='onegi' AND u.status='ACTIVE' AND u.deleted_at IS NULL
    AND m.office_id=target_office AND m.status='ACTIVE'
    AND m.role IN ('OWNER','ADMIN');

  PERFORM 1 FROM public.clients
  WHERE id=target_client AND office_id=target_office
    AND client_name='네네치킨 청라1호점'
    AND regexp_replace(business_registration_number,'[^0-9]','','g')='6012209320'
  FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION '대상 수임업체 정보가 일치하지 않습니다.'; END IF;

  SELECT string_agg(s.email, ', ') INTO missing_emails
  FROM staff_to_register s
  WHERE (SELECT count(*) FROM auth.users a WHERE lower(a.email)=lower(s.email)) <> 1;
  IF missing_emails IS NOT NULL THEN
    RAISE EXCEPTION 'Auth 계정을 먼저 생성하거나 이메일 중복을 확인하세요: %', missing_emails;
  END IF;

  -- 재실행은 허용하지만 다른 계정을 덮어쓰지 않습니다.
  IF EXISTS (
    SELECT 1 FROM staff_to_register s
    JOIN auth.users a ON lower(a.email)=lower(s.email)
    JOIN public.users u ON u.id=a.id OR u.login_id=s.login_id OR lower(u.email)=lower(s.email)
    WHERE u.id<>a.id OR u.login_id<>s.login_id OR lower(u.email)<>lower(s.email)
      OR u.deleted_at IS NOT NULL
  ) THEN RAISE EXCEPTION '기존 사용자와 충돌합니다. 변경 없이 중단합니다.'; END IF;

  INSERT INTO public.users (id,login_id,name,email,status)
  SELECT a.id,s.login_id,s.name,s.email,s.status
  FROM staff_to_register s JOIN auth.users a ON lower(a.email)=lower(s.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.office_members
    (office_id,user_id,role,status,department_name,job_title,joined_at)
  SELECT target_office,a.id,'STAFF',s.status,s.department_name,s.job_title,
    s.joined_date::timestamp AT TIME ZONE 'Asia/Seoul'
  FROM staff_to_register s JOIN auth.users a ON lower(a.email)=lower(s.email)
  ON CONFLICT (office_id,user_id) DO NOTHING;

  IF EXISTS (SELECT 1 FROM public.client_assignments
    WHERE office_id=target_office AND client_id=target_client
      AND assignment_role='PRIMARY' AND user_id<>owner_id)
  THEN RAISE EXCEPTION '다른 주담당자가 있습니다. 변경 없이 중단합니다.'; END IF;

  INSERT INTO public.client_assignments (office_id,client_id,user_id,assignment_role)
  VALUES (target_office,target_client,owner_id,'PRIMARY')
  ON CONFLICT (office_id,client_id,user_id)
  DO UPDATE SET assignment_role='PRIMARY';
END $$;


-- 등록 결과 조회
SELECT u.name,u.login_id,u.email,m.department_name,m.job_title,m.role,m.status,m.joined_at
FROM public.users u JOIN public.office_members m ON m.user_id=u.id
WHERE m.office_id='2dd26db6-92bd-4110-9e06-51f6e43b89cf'
  AND u.login_id IN ('onegi','suhyun.lee','minjun.park','jiyeon.choi','haneul.jung','sejin.oh','doyun.han','gaeun.yoon')
ORDER BY u.login_id;

SELECT c.client_name,c.business_registration_number,u.login_id,a.assignment_role
FROM public.client_assignments a
JOIN public.clients c ON c.id=a.client_id
JOIN public.users u ON u.id=a.user_id
WHERE a.office_id='2dd26db6-92bd-4110-9e06-51f6e43b89cf'
  AND a.client_id='70b03d21-cf5d-4ac2-b479-06aff24385bc';
