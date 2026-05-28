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

## Supabase SQL

스키마 정의 파일은 `supabase/` 폴더에 있으며, 여기서 직접 수정한다.

| 파일 | 내용 |
|------|------|
| `supabase/products.sql` | 상품·상품상세·리뷰·Q&A 테이블 |
| `supabase/order.sql` | 주문 관련 테이블 |
| `supabase/faq.sql` | FAQ 테이블 |
| `supabase/reviews.sql` | (강의 등) 리뷰 테이블 |
| `supabase/user_profiles.sql` | 유저 프로필 테이블 |
| `supabase/common.sql` | 공통 함수/트리거 |
| `supabase/sample_insert.sql` | 샘플 데이터 INSERT |

### 이미 운영 중인 DB에 컬럼 추가 시

`CREATE TABLE` 대신 파일 하단 **마이그레이션 섹션**에 `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 형태로 추가한다. `products.sql` 하단 예시 참고.
