# EduPlatform Implementation Tasks

This document tracks the progress of the EduPlatform implementation, following the Test-Driven Development (TDD) approach and SOLID principles.

## Phase 1 — MVP

### Week 1: Project Setup & Infrastructure
- `[x]` Project structure initialization (client & server folders)
- `[x]` Backend: Node.js/Express setup with TypeScript
- `[x]` Frontend: Next.js 14 setup
- `[/]` Docker configuration (dev & test environments)
- `[/]` Prisma ORM setup & schema definition
- `[x]` Test Infrastructure: Vitest, Supertest, Test DB setup
- `[x]` Test Infrastructure: Factories & MSW mocks setup
- `[x]` Deep Dive Review: Infrastructure & Database Schema

### Week 2: Authentication System
- `[ ]` Auth Tests: Registration, Login, JWT, Role guards (RED)
- `[ ]` Auth implementation: Service, Controller, Middleware (GREEN)
- `[ ]` Email verification via Resend integration
- `[ ]` Refactor auth module & integration tests (REFACTOR)
- `[ ]` Deep Dive Review: Authentication

### Week 3: Course & Subject Management
- `[ ]` Course/Subject Tests: CRUD, section ordering, free preview (RED)
- `[ ]` Subject & Course services implementation (GREEN)
- `[ ]` Section & Lesson services implementation (GREEN)
- `[ ]` Refactor & Integration tests (REFACTOR)
- `[ ]` Deep Dive Review: Course Architecture

### Week 4: Video Streaming Pipeline
- `[ ]` Video Tests: Upload, FFmpeg pipeline, AES-128 key delivery (RED)
- `[ ]` File upload service (TUS protocol) (GREEN)
- `[ ]` Transcoding service (FFmpeg + AES-128 encryption) (GREEN)
- `[ ]` Cloudflare R2 storage integration (GREEN)
- `[ ]` Video playback endpoint & HLS.js player (GREEN)
- `[ ]` Refactor pipeline (REFACTOR)
- `[ ]` Deep Dive Review: Video Security Pipeline

### Week 5: Payment & Subscriptions
- `[ ]` Payment Tests: Checkout, access checks, webhook handlers (RED)
- `[ ]` Subscription service implementation (GREEN)
- `[ ]` Stripe checkout & webhook integration (GREEN)
- `[ ]` PayPal checkout & webhook integration (GREEN)
- `[ ]` Refactor payment flow (REFACTOR)
- `[ ]` Deep Dive Review: Payment Integrations

### Week 6: Frontend - Dashboards & Core UI
- `[ ]` Component Tests: CourseCard, PricingCard, LoginForm (RED)
- `[ ]` Landing page with subject pricing cards (GREEN)
- `[ ]` Student dashboard & course browsing (GREEN)
- `[ ]` Video player integration with progress tracking (GREEN)
- `[ ]` Refactor frontend components & stores (REFACTOR)
- `[ ]` Deep Dive Review: Frontend UI/UX

### Week 7: Polish & E2E Tests
- `[ ]` Playwright E2E Tests: Critical user journeys
- `[ ]` i18n setup (Arabic & English)
- `[ ]` Responsive design and RTL layout verification
- `[ ]` Deploy to staging & manual verification
- `[ ]` Deep Dive Review: Release Candidate
