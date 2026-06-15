-- 업데이트 시점 갱신
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;



-- =============================================
-- 2026-06-15: 어드민 판별 함수
-- auth.users 테이블의 raw_user_meta_data 또는 JWT custom claim 기반
-- Supabase 대시보드에서 user를 admin으로 설정하는 두 가지 방법:
--   1. JWT 커스텀 클레임: auth.jwt() ->> 'role' = 'admin'
--   2. user_metadata: auth.jwt() -> 'user_metadata' ->> 'role' = 'admin'
-- =============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER STABLE
AS $$
BEGIN
  RETURN COALESCE(
    auth.jwt() ->> 'role' = 'admin',
    (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin',
    FALSE
  );
END $$;

COMMENT ON FUNCTION public.is_admin IS
  'JWT의 role 클레임 또는 user_metadata.role = ''admin'' 이면 true.
   Supabase 대시보드 > Authentication > Users > Edit user > Custom Claims 에서 설정.';
