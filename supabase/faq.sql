-- 1) 테이블: faq
create table public.faq (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 수정 시 update date 반영
create trigger set_faq_updated_at
before update on public.faq
for each row execute function public.set_updated_at();

-- 2) RLS 활성화
alter table public.faq enable row level security;

-- 3) admin 판별 헬퍼 (JWT에 role=admin 가정)
-- 필요 시 app_metadata, custom claim에 맞춰 수정
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- 4) 정책
-- 조회: 모두 허용
create policy "faq select for all"
  on public.faq
  for select
  using (true);

-- 작성: admin만
create policy "faq insert for admin"
  on public.faq
  for insert
  with check (public.is_admin());

-- 수정: admin만
create policy "faq update for admin"
  on public.faq
  for update
  using (public.is_admin());

-- 삭제: admin만
create policy "faq delete for admin"
  on public.faq
  for delete
  using (public.is_admin());