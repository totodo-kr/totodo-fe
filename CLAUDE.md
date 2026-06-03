# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test suite is configured.

## Tech Stack

- **Framework:** Next.js (App Router) with React 19, TypeScript 5
- **Backend/Auth:** Supabase (auth, database, file storage) — client at `src/utils/supabase/client.ts`, server at `src/utils/supabase/server.ts`
- **State:** Zustand (`src/store/`) — `useAuthStore` for auth, `useSliderStore` for homepage carousel
- **Styling:** Tailwind CSS v4 with custom purple/magenta brand palette defined in `src/app/globals.css`
- **Rich Text:** TipTap v3 for review/content editing
- **Icons:** Lucide React
- **Class Utilities:** `clsx` + `tailwind-merge` for conditional/merged class names

## Architecture

### Routing & Layouts

App Router folder-based routing under `src/app/`. Key route groups:
- `/academy/[id]/` — course detail; `/academy/[id]/session/[sessionId]/` — full-page session (no navbar/footer)
- `/shop/books/[id]/`, `/shop/goods/[id]/` — product pages
- `/faq/`, `/faq/[id]/` — FAQ with pagination via `?page=N` query param
- `/reviews/[id]/` — review detail
- `/settings/*` — user settings sub-pages

**ConditionalLayout** (`src/components/ConditionalLayout.tsx`) controls navbar/footer visibility — it hides both on full-page routes like session players.

**SettingsLayout** (`src/components/SettingsLayout.tsx`) wraps all `/settings/*` pages with a shared sidebar.

### Auth Flow

1. `AuthStateSync` (`src/components/AuthStateSync.tsx`) syncs Supabase session into Zustand `useAuthStore` on mount via `onAuthStateChange`.
2. `AuthGuard` wraps protected routes and redirects unauthenticated users.
3. `LoginModal` handles email/password + OAuth (Google, Kakao).
4. OAuth callback handled at `/auth/` route.

### Data Fetching Pattern

Custom hooks in `src/hooks/` fetch from Supabase client-side. Hooks use `useCallback`/`useMemo` for stability. Examples: `useProfile`, `useFaqs` (10 items/page), `useReviews`.

### Responsive Layout

Separate `Navbar` (desktop) and `MobileNavbar` components — both rendered in layout but toggled via CSS breakpoints. Mobile sidebar handled in `MobileNavbar`.

### Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Image Domains

Allowed remote image domains in `next.config.ts`: `images.unsplash.com`, `cdn.publishingkit.net`, `*.supabase.co`, `*.s3.ap-northeast-2.amazonaws.com`.

### Path Alias

`@/*` maps to `./src/*`.

## Admin Pages — Atomic Design Pattern

관리자 페이지(`src/app/admin/`)를 추가하거나 수정할 때는 `src/components/admin/`의 공통 컴포넌트를 반드시 활용한다.

### 컴포넌트 구조

```
src/components/admin/
├── atoms/          # 더 이상 쪼갤 수 없는 기본 단위
│   ├── Spinner     - 로딩 스피너 (size: xs/sm/md/lg, color prop)
│   ├── Badge       - 상태 배지 (bg, color props로 색상 지정)
│   └── EmptyState  - "데이터 없음" 메시지
│
├── molecules/      # atom 조합 또는 단일 역할 UI
│   ├── SearchBar       - 검색 폼 (아이콘 + 인풋, onSubmit/onChange/value)
│   ├── ResultCount     - "총 N개" 표시 (total, unit props)
│   ├── Pagination      - 페이지네이션 (page, totalPages, loading, onChange)
│   ├── FilterTabs      - 필터 탭 버튼 (제네릭 타입 T, tabs/active/onChange)
│   ├── ToggleButton    - 상태 토글 버튼 (active, pending, activeColor, activeLabel/inactiveLabel)
│   └── IconActionButton - 아이콘 액션 버튼 (icon, loading, variant: default|danger)
│
└── organisms/      # 페이지 단위 복합 UI
    ├── AdminPageHeader - 페이지 헤더 (title, description, action?: {label, href|onClick})
    └── AdminTable      - 데이터 테이블 (columns, gridTemplateColumns, loading, isEmpty, children)
```

### 임포트 방법

```ts
import { AdminPageHeader, AdminTable } from "@/components/admin/organisms";
import { SearchBar, ResultCount, Pagination, FilterTabs, ToggleButton, IconActionButton } from "@/components/admin/molecules";
import { Spinner, Badge, EmptyState } from "@/components/admin/atoms";
```

### 목록 페이지 작성 패턴

```tsx
// 1. 컬럼 정의 (파일 상단 상수로)
const COLUMNS = [
  { label: "제목" },
  { label: "상태", className: "text-center" },
  { label: "관리", className: "text-center" },
];
const GRID = "1fr 100px 80px";

export default function AdminXxxPage() {
  return (
    <div className="p-8 max-w-6xl">
      {/* 헤더: 제목 + 설명 + 선택적 액션 버튼 */}
      <AdminPageHeader
        title="XXX 관리"
        description="..."
        action={{ label: "새로 추가", href: "/admin/xxx/write" }} // 필요 시
      />

      {/* 검색 + 결과 수 */}
      <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
        <SearchBar value={keyword} onChange={setKeyword} onSubmit={handleSearch} placeholder="..." />
        <ResultCount total={total} unit="개" /> {/* unit: 개/명/건 */}
      </div>

      {/* 필터 탭 (필요 시) */}
      <FilterTabs tabs={tabs} active={activeTab} onChange={handleTabChange} />

      {/* 테이블 */}
      <AdminTable
        columns={COLUMNS}
        gridTemplateColumns={GRID}
        loading={loading}
        isEmpty={items.length === 0}
        emptyMessage="항목이 없습니다."
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="grid items-center px-5 py-3.5 border-b last:border-b-0 hover:bg-[#efe9de]/30 transition-colors"
            style={{ gridTemplateColumns: GRID, borderColor: "#e6dfd8" }}
          >
            {/* 행 내용 */}
          </div>
        ))}
      </AdminTable>

      {/* 페이지네이션 */}
      <Pagination page={page} totalPages={totalPages} loading={loading} onChange={handlePage} />
    </div>
  );
}
```

### 컴포넌트별 사용 지침

- **`ToggleButton`**: 공개/비공개, 활성/비활성 등 on/off 토글에 사용. `activeColor`로 활성 색상, `activeBg`/`inactiveBg`로 배경색, `pill`로 `rounded-full` 형태 지정 가능. (`#5db872` 초록, `#cc785c` 브랜드, `#e8a55a` 골드 등)
- **`SearchSelect`**: 탭 개수가 늘어날 수 있는 필터 선택에 사용. 드롭다운에 검색 인풋이 포함된 자동완성 셀렉트. `options`에 `prefix` 필드를 주면 코드값 등 작은 배지로 표시됨.
- **`IconActionButton`**: 수정(`variant="default"`)·삭제(`variant="danger"`) 아이콘 버튼. `loading` prop으로 pending 스피너 처리.
- **`FilterTabs`**: 제네릭 타입 `T`를 사용하므로 `string | number | undefined` 범위 내 어떤 값이든 가능.
- **`Badge`**: 주문 상태 등 색상이 동적으로 결정되는 배지. `bg`/`color` props에 직접 hex 값 전달.
- **`Spinner`**: 테이블 로딩은 `AdminTable`이 자동 처리. 버튼 내부 pending 상태에만 직접 사용.

### 브랜드 컬러 팔레트 (인라인 스타일 기준)

| 용도 | 값 |
|------|-----|
| 브랜드 주색 | `#cc785c` |
| 브랜드 hover | `#a9583e` |
| 배경 (기본) | `#faf9f5` |
| 배경 (보조) | `#efe9de` |
| 보더 | `#e6dfd8` |
| 텍스트 (진함) | `#141413` |
| 텍스트 (중간) | `#252523`, `#6c6a64` |
| 텍스트 (연함) | `#8e8b82` |
| 성공 (초록) | `#5db872` |
| 위험 (빨강) | `#c64545` |

---

## Supabase SQL

스키마 정의 파일은 `supabase/` 폴더에 있으며, 여기서 직접 수정한다.

| 파일 | 내용 |
|------|------|
| `supabase/codes.sql` | 공통 코드 테이블 (delivery_type 등 관리자 관리 코드). products.sql보다 먼저 실행 |
| `supabase/products.sql` | 상품·상품상세·리뷰·Q&A 테이블 |
| `supabase/order.sql` | 주문 관련 테이블 |
| `supabase/faq.sql` | FAQ 테이블 |
| `supabase/reviews.sql` | (강의 등) 리뷰 테이블 |
| `supabase/user_profiles.sql` | 유저 프로필 테이블 |
| `supabase/notifications.sql` | 알림 테이블 |
| `supabase/common.sql` | 공통 함수/트리거 |
| `supabase/sample_insert.sql` | 샘플 데이터 INSERT |

### 이미 운영 중인 DB에 컬럼 추가 시

`CREATE TABLE` 대신 파일 하단 **마이그레이션 섹션**에 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 형태로 추가한다. `products.sql` 하단 예시 참고.
