-- =============================================
-- 공통 함수 모음
-- =============================================

-- updated_at 자동 갱신 트리거 함수 (전 테이블 공용)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END $$;

-- 어드민 판별 헬퍼
-- profiles.role = 'admin' 인 유저만 true 반환
-- security definer: profiles RLS와 무관하게 항상 읽기 가능
-- 주의: 이 함수는 common.sql 에만 정의. 다른 파일에 중복 정의 금지.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;
