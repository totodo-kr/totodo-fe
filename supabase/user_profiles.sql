-- =============================================
-- 유저 프로필 테이블
-- Supabase Auth 유저와 1:1 매핑
-- 사전 조건: common.sql (is_admin 함수)
-- =============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  email          TEXT,
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
  INSERT INTO public.profiles (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
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

-- email 컬럼 추가 및 기존 유저 데이터 채우기
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- =============================================
-- 2026/07/20 — 배송지 목록 (계정 설정 > 배송지 관리)
-- 유저당 여러 개의 배송지를 저장하고 하나를 기본 배송지로 지정.
-- 체크아웃에서 드롭다운으로 선택.
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_name  VARCHAR(100) NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  zipcode         VARCHAR(10) NOT NULL,
  address         TEXT NOT NULL,
  address_detail  TEXT,
  is_default      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);

-- 유저당 기본 배송지는 최대 1개
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_addresses_one_default
  ON public.user_addresses(user_id) WHERE is_default;

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_addresses_own" ON public.user_addresses FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_addresses_updated_at ON public.user_addresses;
CREATE TRIGGER update_user_addresses_updated_at
  BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 기본 배송지 원자적 전환: 기존 기본 해제 후 지정 배송지를 기본으로.
-- 유니크 인덱스(idx_user_addresses_one_default) 충돌 없이 스왑하기 위해 RPC로 분리.
CREATE OR REPLACE FUNCTION public.set_default_address(p_address_id INTEGER)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.user_addresses SET is_default = FALSE
  WHERE user_id = auth.uid() AND is_default = TRUE AND id != p_address_id;

  UPDATE public.user_addresses SET is_default = TRUE
  WHERE id = p_address_id AND user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_default_address(INTEGER) TO authenticated;
