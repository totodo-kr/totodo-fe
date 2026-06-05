-- page_blocks: 메인 페이지 블록 기반 컨텐츠 관리

create table public.page_blocks (
  id          uuid primary key default gen_random_uuid(),
  page_key    text not null default 'home',
  type        text not null check (type in ('text', 'image', 'fade_text', 'video', 'action_button', 'grid')),
  order_index integer not null default 0,
  data        jsonb not null default '{}',
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index page_blocks_page_key_order on public.page_blocks(page_key, order_index);

create trigger set_page_blocks_updated_at
before update on public.page_blocks
for each row execute function public.set_updated_at();

-- RLS
alter table public.page_blocks enable row level security;

create policy "page_blocks select"
  on public.page_blocks
  for select
  using (is_visible = true or public.is_admin());

create policy "page_blocks insert for admin"
  on public.page_blocks
  for insert
  with check (public.is_admin());

create policy "page_blocks update for admin"
  on public.page_blocks
  for update
  using (public.is_admin());

create policy "page_blocks delete for admin"
  on public.page_blocks
  for delete
  using (public.is_admin());

-- Storage bucket policy: page-blocks 폴더 관리자만 업로드/삭제, 모두 읽기 가능
-- (Supabase 대시보드에서 totodo_pub_storage 버킷에 적용)
-- INSERT: bucket_id = 'totodo_pub_storage' AND (storage.foldername(name))[1] = 'page-blocks' AND is_admin()
-- DELETE: bucket_id = 'totodo_pub_storage' AND (storage.foldername(name))[1] = 'page-blocks' AND is_admin()
