-- 1. Profiles (사용자 프로필)
-- Supabase Auth의 유저와 1:1 매핑되어 닉네임, 아바타 등을 저장
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  name text,          -- 이름 (실명)
  country text,       -- 거주국가
  gender text,        -- 성별 (예: 'Male', 'Female')
  birth_date date,    -- 생년월일
  avatar_url text,    -- 프로필 이미지 (Auth와 별도로 관리할 경우)
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Profiles RLS (보안 정책)
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." 
  on public.profiles for select using (true);

create policy "Users can update own profile." 
  on public.profiles for update using (auth.uid() = id);

-- 회원가입 시 자동으로 profiles에 데이터 생성하는 트리거 함수
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    -- 소셜 로그인(Google 등)에서 넘어오는 이름 정보를 저장
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

-- 트리거 등록
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles add column job_description text;

alter table public.profiles add column if not exists phone text;

alter table public.profiles add column if not exists display_name text;

-- 2. 기존 name 데이터를 display_name으로 복사 (데이터 마이그레이션)
update public.profiles 
set display_name = name 
where display_name is null;

-- 수정 시 update date 반영
create trigger set_faq_updated_at
before update on public.faq
for each row execute function public.set_updated_at();

-- =============================================
-- 마이그레이션: 어드민의 프로필(role) 수정 허용
-- =============================================
DROP POLICY IF EXISTS "Admins can update any profile." ON public.profiles;

CREATE POLICY "Admins can update any profile."
  ON public.profiles FOR UPDATE
  USING (public.is_admin());
