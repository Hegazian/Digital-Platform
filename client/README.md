# 💻 EduPlatform Client — Next.js 14 Web Application

The web frontend for EduPlatform, built with **Next.js 14.2.35 (App Router)**, **React 18**, **TypeScript**, **Tailwind CSS 3.4**, **Zustand**, and **TanStack React Query**.

For complete system documentation, see [`../docs/README.md`](../docs/README.md).

---

## 🎨 Frontend Architecture & Key Patterns

### 1. Bilingual LTR/RTL Support (`en` / `ar`)
- **Default Locale**: English (`en`, LTR) using Google Font **Inter**, with one-click toggle to Arabic (`ar`, RTL) using **Tajawal**.
- **Translation Hook**: Components use `useT()` (`src/lib/useT.ts`) as `t('English text', 'النص العربي')` alongside bilingual database fields (`titleEn` / `titleAr`).
- **Direction Sync**: `document.documentElement.dir` and `lang` update reactively from `useAppStore`.

### 2. Dynamic Branding & Home Content Engine
- Bootstrapped in [`src/app/providers.tsx`](src/app/providers.tsx) via `useConfigStore` (`GET /api/v1/config`).
- Applies runtime site name, slogan, `--brand-primary` CSS custom property, feature flags, and `homeContent` marketing sections with fallback to `DEFAULT_HOME_CONTENT` ([`src/lib/configStore.ts`](src/lib/configStore.ts)).

### 3. State Management & API Layer
- **`fetchApi`** ([`src/lib/api.ts`](src/lib/api.ts)): Injects Bearer access token, sends `credentials: 'include'` for the `eduplat_rt` `httpOnly` cookie, and performs single-flight `POST /api/v1/auth/refresh` on `401` responses.
- **`useAppStore`** ([`src/lib/store.ts`](src/lib/store.ts)): Persists `lang`, `user`, `token`, and selected course/subject in `localStorage` (`eduplatform-storage`).
- **`useConfigStore`** ([`src/lib/configStore.ts`](src/lib/configStore.ts)): Caches public platform configuration and feature flags.
- **TanStack React Query**: Manages server cache and invalidates queries on `eduplat:session-expired`.

---

## 📁 Directory Structure

```text
client/
├── e2e/                        # Playwright E2E test suites (7 spec files)
├── public/                     # Static assets
├── src/
│   ├── app/                    # Next.js 14 App Router pages
│   │   ├── admin/dashboard/    # Admin Console (/admin/dashboard)
│   │   ├── courses/            # Catalog (/courses) & Player (/courses/[courseId])
│   │   ├── login/              # Login + MFA challenge page (/login)
│   │   ├── profile/            # User profile settings (/profile)
│   │   ├── register/           # Student & Teacher registration (/register)
│   │   ├── student/dashboard/  # Student Dashboard (/student/dashboard)
│   │   ├── teacher/dashboard/  # Teacher Studio (/teacher/dashboard)
│   │   ├── layout.tsx          # Root HTML shell & fonts
│   │   ├── page.tsx            # Configurable Landing Page (/)
│   │   └── providers.tsx       # React Query & Config bootstrapper
│   ├── components/             # UI & Domain Components
│   │   ├── admin/              # Admin tabs (Metrics, Users, Approvals, Orders, Vouchers, Settings, etc.)
│   │   ├── ai/                 # AITutorDrawer
│   │   ├── commerce/           # CheckoutModal, VoucherRedeemModal
│   │   ├── discussions/        # DiscussionForum
│   │   ├── editor/             # TiptapEditor (sanitized via isomorphic-dompurify)
│   │   ├── player/             # VideoPlayerSection, InteractiveQuizRunner, AssignmentRunner, etc.
│   │   ├── settings/           # MfaSetupModal
│   │   ├── teacher/            # CourseManager, AssignmentStudio, LiveSessionsManager, etc.
│   │   └── ui/                 # Accessible Modal primitive
│   ├── lib/                    # api.ts, apiTypes.ts, store.ts, configStore.ts, useRequireRole.ts, useT.ts
│   └── middleware.ts           # Edge route guard for /admin, /teacher, /student, /profile
├── next.config.mjs             # Rewrites (/api/v1 & /uploads -> :5000) and strict build gates
├── playwright.config.ts        # Dual webServer E2E runner (Next :3000 + API :5000)
├── tailwind.config.ts          # Tailwind theme tokens
└── package.json
```

---

## 🛠️ Getting Started

```bash
cd client
npm ci

# Start Next.js development server on http://localhost:3000
npm run dev
```

Optional `.env.local` (if not relying on default `/api/v1` Next.js rewrite to `http://localhost:5000`):
```ini
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

---

## 🏗️ Build, Lint & E2E Commands

```bash
# TypeScript check
npm run typecheck

# ESLint check
npm run lint

# Production build (fails on any TypeScript or ESLint error)
npm run build

# Run Playwright E2E tests (starts both client and server if not running)
npx playwright test
```
