-- 1) 메인 메뉴 테이블
create table public.menus (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,
  href       text        not null,
  sort_order integer     not null default 0,
  is_visible boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_menus_updated_at
before update on public.menus
for each row execute function public.set_updated_at();

-- 2) 서브 메뉴 테이블
-- position: 'left' | 'center' | 'right' (서브바 3분할 영역)
-- icon: lucide 아이콘 이름 (우측 아이콘 전용, e.g. 'Heart', 'ShoppingCart')
create table public.sub_menus (
  id         uuid        primary key default gen_random_uuid(),
  menu_id    uuid        not null references public.menus(id) on delete cascade,
  name       text        not null,
  href       text        not null,
  position   text        not null default 'center',
  icon       text,
  sort_order integer     not null default 0,
  is_visible boolean     not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sub_menus_position_check check (position in ('left', 'center', 'right'))
);

create trigger set_sub_menus_updated_at
before update on public.sub_menus
for each row execute function public.set_updated_at();

-- 3) RLS
alter table public.menus     enable row level security;
alter table public.sub_menus enable row level security;

-- 조회: 모두 허용 (Navbar에서 비인증 사용자도 읽어야 함)
create policy "menus select for all"
  on public.menus for select using (true);

create policy "sub_menus select for all"
  on public.sub_menus for select using (true);

-- 변경: admin만
create policy "menus insert for admin"
  on public.menus for insert with check (public.is_admin());

create policy "menus update for admin"
  on public.menus for update using (public.is_admin());

create policy "menus delete for admin"
  on public.menus for delete using (public.is_admin());

create policy "sub_menus insert for admin"
  on public.sub_menus for insert with check (public.is_admin());

create policy "sub_menus update for admin"
  on public.sub_menus for update using (public.is_admin());

create policy "sub_menus delete for admin"
  on public.sub_menus for delete using (public.is_admin());

-- 4) 샘플 데이터 (현재 Navbar 하드코딩 값과 동일)
insert into public.menus (name, href, sort_order, is_visible) values
  ('홈',           '/',        0, true),
  ('이세계 학원', '/academy', 1, true),
  ('상점',         '/shop',    2, true),
  ('커뮤니티',    '/community', 3, true),
  ('자주 묻는 질문', '/faq',  4, true);

-- 학원 서브 메뉴
insert into public.sub_menus (menu_id, name, href, position, sort_order, is_visible)
select m.id, v.name, v.href, v.position, v.sort_order, true
from public.menus m,
  (values
    ('홈',          '/academy',            'center', 0),
    ('내 강의실',   '/academy/my-lectures','center', 1),
    ('나의 북마크', '/academy/bookmarks',  'center', 2)
  ) as v(name, href, position, sort_order)
where m.href = '/academy';

-- 상점 서브 메뉴 (중앙)
insert into public.sub_menus (menu_id, name, href, position, sort_order, is_visible)
select m.id, v.name, v.href, v.position, v.sort_order, true
from public.menus m,
  (values
    ('홈',   '/shop',       'center', 0),
    ('도서', '/shop/books', 'center', 1),
    ('잡화', '/shop/goods', 'center', 2)
  ) as v(name, href, position, sort_order)
where m.href = '/shop';

-- 상점 서브 메뉴 (우측 아이콘)
insert into public.sub_menus (menu_id, name, href, position, icon, sort_order, is_visible)
select m.id, v.name, v.href, v.position, v.icon, v.sort_order, true
from public.menus m,
  (values
    ('위시리스트', '/shop/wishlist', 'right', 'Heart',        0),
    ('장바구니',   '/shop/cart',     'right', 'ShoppingCart', 1)
  ) as v(name, href, position, icon, sort_order)
where m.href = '/shop';

-- =============================================
-- 마이그레이션: 강의 후기 → 커뮤니티 (2026-06-10)
-- 이미 운영 중인 DB에 실행
-- =============================================
UPDATE public.menus
SET name = '커뮤니티', href = '/community'
WHERE href = '/reviews';
