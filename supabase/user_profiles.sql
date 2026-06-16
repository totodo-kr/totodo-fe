-- =============================================
-- 유저 프로필 테이블
-- Supabase Auth 유저와 1:1 매핑
-- 사전 조건: common.sql (is_admin 함수)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  name           TEXT,
  display_name   TEXT,
  country        TEXT,
  gender         TEXT,
  birth_date     DATE,
  avatar_url     TEXT,
  phone          TEXT,
  job_description TEXT,
  role           TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update any profile."
  ON public.profiles FOR UPDATE USING (public.is_admin());

-- 회원가입 시 자동으로 profiles 행 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =============================================
-- 마이그레이션: 컬럼 추가 (이미 운영 중인 DB)
-- =============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_description TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

UPDATE public.profiles SET display_name = name WHERE display_name IS NULL;
