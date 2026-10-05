# 💻 EduPlatform Client — Next.js 14 Modern Web Application

The interactive web frontend for the EduPlatform e-learning system. Built with Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, and Zustand.

---

## 🎨 Frontend Architecture & Features

### 1. Bilingual RTL/LTR System
- **Arabic (`ar`) RTL**: Default primary locale using Google Font **Tajawal** for clear Arabic typography.
- **English (`en`) LTR**: Full mirror layout using Google Font **Inter**.
- Real-time locale switching preserved across user sessions and synchronized with document `dir="rtl"` / `dir="ltr"`.

### 2. Live Dynamic Home Page Content Engine
- All marketing copy, badges, titles, descriptions, CTA buttons, and footer information on the landing page are dynamically driven by the backend `AppConfig.homeContent` configuration.
- **Zero-Regression Fallbacks**: Powered by `useHomeContent()` in [`src/lib/configStore.ts`](src/lib/configStore.ts). If any field is unset or custom config is missing, the application seamlessly falls back to `DEFAULT_HOME_CONTENT`.
- **Dynamic Brand Theming**: The platform's primary accent color is injected at runtime into `--brand-primary` and `<meta name="theme-color">`.

### 3. State Management
- **`useAppStore`** ([`src/lib/store.ts`](src/lib/store.ts)): User authentication, access token, user role, active language, and UI modal states.
- **`useConfigStore`** ([`src/lib/configStore.ts`](src/lib/configStore.ts)): Global platform settings, site name, slogan, exchange rates, feature flags, and `useHomeContent()`.

### 4. Interactive Learning Components
- **In-Browser Code Runner**: CodeMirror-based Python editor connected to the backend execution sandbox for programming lessons.
- **Collaborative Whiteboard Canvas**: Multiplayer drawing board for real-time math, geometry, and physics problem solving.
- **Secure Video Player**: Custom HLS video player with resolution controls, playback rate adjustments, and secure key acquisition.
- **Tiptap Rich-Text Editor**: WYSIWYG editor for lesson notes, formatted text, and mathematical expressions.
- **AI Tutor Drawer**: Slide-out conversational tutor for interactive lesson guidance and explanations.

---

## 📁 Directory Structure

```
client/
├── public/                 # Static assets, logos, and icons
├── src/
│   ├── app/                # Next.js 14 App Router
│   │   ├── admin/          # Admin Dashboard (/admin/dashboard)
│   │   ├── courses/        # Course catalog & Course Player (/courses/[courseId])
│   │   ├── student/        # Student Dashboard & progress tracking
│   │   ├── teacher/        # Teacher Studio & Course Manager
│   │   ├── layout.tsx      # Root HTML layout with font imports & Providers
│   │   ├── page.tsx        # Dynamic Landing Page (Hero, Badges, Steps, Footer)
│   │   └── providers.tsx   # Config bootstrap, query client, and theme providers
│   ├── components/         # Reusable Component Library
│   │   ├── admin/          # PlatformSettings (Home Content Editor), ApprovalQueue, etc.
│   │   ├── editor/         # CodePlayground, CollaborativeBoard, TiptapEditor
│   │   ├── player/         # VideoPlayerSection, LessonList, MaterialList
│   │   ├── teacher/        # CourseManager, EditLessonModal, QuizEditor
│   │   ├── Navbar.tsx      # Dynamic Top Navigation bar with bilingual toggle
│   │   ├── Hero.tsx        # Dynamic Hero section with customizable topic badges
│   │   ├── AuthModal.tsx   # Unified Login / Signup / Teacher Application modal
│   │   └── ...
│   └── lib/                # Client Utilities & Stores
│       ├── api.ts          # Centralized fetchApi client with JWT bearer injection
│       ├── apiTypes.ts     # Standardized API response types & error extractors
│       ├── store.ts        # App & Auth Zustand store
│       └── configStore.ts  # Public config, StrictHomeContent, and useHomeContent() hook
├── tailwind.config.ts      # Tailwind CSS theme, animations, and color tokens
└── package.json
```

---

## 🛠️ Getting Started

### 1. Install Dependencies
```bash
cd client
npm install
```

### 2. Configure Environment
Create a `.env.local` file:
```ini
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 🏗️ Build & Validation Commands

```bash
# Typecheck and produce optimized production build
npm run build

# Run ESLint validation
npm run lint
```
The build process compiles static pages and verifies that all TypeScript types, React hooks, and component interfaces pass without errors.
