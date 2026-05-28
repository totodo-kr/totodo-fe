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
