-- 2. Reviews (강의 후기 게시글)
create table public.reviews (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  content text not null,
  view_count integer default 0,
  is_pinned boolean default false,
  board_type text default 'review', -- 게시판 구분
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Reviews RLS
alter table public.reviews enable row level security;

create policy "Reviews are viewable by everyone." 
  on public.reviews for select using (true);

create policy "Authenticated users can create reviews." 
  on public.reviews for insert with check (auth.uid() = user_id);

create policy "Users can update own reviews." 
  on public.reviews for update using (auth.uid() = user_id);

create policy "Users can delete own reviews." 
  on public.reviews for delete using (auth.uid() = user_id);

-- 수정 시 update date 반영
create trigger set_reviews_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

-- 3. Review Comments (댓글)
create table public.review_comments (
  id bigint generated always as identity primary key,
  review_id bigint references public.reviews(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Review Comments RLS
alter table public.review_comments enable row level security;

create policy "Comments are viewable by everyone." 
  on public.review_comments for select using (true);

create policy "Authenticated users can create comments." 
  on public.review_comments for insert with check (auth.uid() = user_id);

create policy "Users can update own comments." 
  on public.review_comments for update using (auth.uid() = user_id);

create policy "Users can delete own comments." 
  on public.review_comments for delete using (auth.uid() = user_id);

create trigger set_review_comments_updated_at
before update on public.review_comments
for each row execute function public.set_updated_at();

-- 4. Review Attachments (첨부파일 메타데이터)
create table public.review_attachments (
  id bigint generated always as identity primary key,
  review_id bigint references public.reviews(id) on delete cascade not null,
  file_url text not null,
  file_name text not null,
  file_size integer,
  file_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Review Attachments RLS
alter table public.review_attachments enable row level security;

create policy "Attachments are viewable by everyone." 
  on public.review_attachments for select using (true);

create policy "Authenticated users can add attachments." 
  on public.review_attachments for insert with check (auth.role() = 'authenticated');
-- =============================================
-- 마이그레이션: 어드민 RLS 정책 추가
-- (이미 운영 중인 DB에 실행)
-- =============================================

-- 어드민은 모든 후기 수정 가능 (핀 설정 등)
create policy "Admin can update any review."
  on public.reviews for update
  using (public.is_admin());

-- 어드민은 모든 후기 삭제 가능
create policy "Admin can delete any review."
  on public.reviews for delete
  using (public.is_admin());
