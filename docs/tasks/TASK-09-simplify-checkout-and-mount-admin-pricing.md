# TASK-09: Simplify Checkout Modal for 100% Reliability & Mount Admin `CoursePricingManager`

- **Phase**: Phase 3 — Core Bug Fixes & UI Completion
- **Dependencies**: [TASK-08](./TASK-08-fix-assignments-audit-logs-live-sessions-and-teacher-analytics.md)
- **Estimated Effort**: 2 hours
- **Target Issue IDs**: Unmounted `CoursePricingManager.tsx`, Uninitiated Paymob/Fawry checkout spinner in `CheckoutModal.tsx` (Simplification Decision 4)

---

## 1. Objective & Problem Statement

1. **Orphaned Admin Pricing Component (`CoursePricingManager.tsx`)**:
   - [`client/src/components/admin/CoursePricingManager.tsx`](../../client/src/components/admin/CoursePricingManager.tsx) is fully built and wired to `GET /api/v1/commerce/products`, `POST /api/v1/commerce/products`, and `PUT /api/v1/subjects/:id/pricing`, but it is **never imported or rendered** in [`AdminDashboard.tsx`](../../client/src/components/AdminDashboard.tsx). Admins currently have no UI to set course or subject prices!
2. **Dead-End Gateway Tabs in `CheckoutModal.tsx`**:
   - [`client/src/components/commerce/CheckoutModal.tsx`](../../client/src/components/commerce/CheckoutModal.tsx) offers `PAYMOB` (Card) and `FAWRY` payment options alongside `MANUAL` (Vodafone Cash / InstaPay).
   - Because `CommerceService.createOrder` does not call an external Paymob/Fawry checkout initiation API to generate a redirect URL, selecting `PAYMOB` or `FAWRY` creates a `PENDING` order and leaves the student on an infinite polling screen waiting for a webhook that will never fire.
3. **Simplification Outcome**:
   - Mount `CoursePricingManager.tsx` inside [`AdminDashboard.tsx`](../../client/src/components/AdminDashboard.tsx) under a dedicated **Pricing & Products** tab (or inside the **Courses / Commerce** tab).
   - Streamline [`CheckoutModal.tsx`](../../client/src/components/commerce/CheckoutModal.tsx) so **Manual Wallet Transfer (Vodafone Cash / InstaPay)** with reference number entry and **Voucher Code Redemption** are the primary, 100% reliable payment methods in the UI (while keeping the backend Paymob/Fawry webhook endpoints intact for future gateway activation).

---

## 2. Files to Modify

| File | Action | Purpose |
| :--- | :---: | :--- |
| [`client/src/components/AdminDashboard.tsx`](../../client/src/components/AdminDashboard.tsx) | Modify | Import and mount `CoursePricingManager` under a `'pricing'` tab in the Admin Console navigation bar. |
| [`client/src/components/admin/CoursePricingManager.tsx`](../../client/src/components/admin/CoursePricingManager.tsx) | Modify | Verify clean TypeScript props and React Query invalidation when creating course products or updating subject pricing. |
| [`client/src/components/commerce/CheckoutModal.tsx`](../../client/src/components/commerce/CheckoutModal.tsx) | Modify | Default payment method to `MANUAL` (Vodafone Cash / InstaPay transfer reference) + direct link/tab to redeem a `Voucher` code, hiding unconfigured `PAYMOB`/`FAWRY` buttons unless `NEXT_PUBLIC_ENABLE_GATEWAY_CHECKOUT === 'true'`. |

---

## 3. Step-by-Step TDD Implementation Guide

### Step 1: Write Failing Tests First (`Red` Phase)

In [`client/e2e/navigation.spec.ts`](../../client/e2e/navigation.spec.ts) (or a new component test in Task 12):
- Add an E2E assertion that logging in as `ADMIN` and navigating to `/admin/dashboard` displays the **Pricing & Products** tab and renders `CoursePricingManager` (`Subject Pricing` / `Course Products`).

---

### Step 2: Implement the UI Wiring & Checkout Simplification (`Green` Phase)

#### 2.1 Mount `CoursePricingManager` in `AdminDashboard.tsx`
1. In [`client/src/components/AdminDashboard.tsx`](../../client/src/components/AdminDashboard.tsx):
   - Import `CoursePricingManager from './admin/CoursePricingManager'`.
   - Add `'pricing'` to the `activeTab` union state.
   - Add a tab button (`Pricing & Products` / `التسعير والمنتجات` with the `Tag` icon) to the Admin tab bar.
   - Render `{activeTab === 'pricing' && <CoursePricingManager />}`.

#### 2.2 Streamline `CheckoutModal.tsx`
1. In [`client/src/components/commerce/CheckoutModal.tsx`](../../client/src/components/commerce/CheckoutModal.tsx):
   - Default `paymentMethod` to `'MANUAL'`.
   - Gate the `PAYMOB` and `FAWRY` radio options behind `process.env.NEXT_PUBLIC_ENABLE_GATEWAY_CHECKOUT === 'true'` so students in standard deployments only see working **Manual Wallet Transfer (Vodafone Cash / InstaPay)** with clear instructions + transaction reference input.

---

### Step 3: Refactor & Cleanup (`Refactor` Phase)

Verify that creating a Course Product in `CoursePricingManager` immediately makes that course purchasable in `/courses/[courseId]` via `CheckoutModal`.

---

## 4. Code Review Checklist

- [x] Is `CoursePricingManager.tsx` mounted and accessible from `AdminDashboard.tsx`?
- [x] Can an Admin create a `COURSE` product price and update `SUBJECT` period prices from the UI without errors?
- [x] Does `CheckoutModal.tsx` default to `MANUAL` wallet transfer and require a transaction reference so students never get stuck on an uninitiated gateway spinner?

---

## 5. Verification & Test Commands

```bash
cd client
npm run typecheck
npm run lint
npm run build
```
