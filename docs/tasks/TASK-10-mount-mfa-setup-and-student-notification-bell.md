# TASK-10: Mount `MfaSetupModal` on `/profile` & Build Student `NotificationBell` UI

- **Phase**: Phase 3 — Core Bug Fixes & UI Completion
- **Dependencies**: [TASK-09](./TASK-09-simplify-checkout-and-mount-admin-pricing.md)
- **Estimated Effort**: 2–2.5 hours
- **Target Issue IDs**: Unmounted `MfaSetupModal.tsx` on `/profile`, Missing student Notification UI for teacher announcements (Simplification Decision 5)

---

## 1. Objective & Problem Statement

1. **Unmounted Two-Factor Authentication Setup (`MfaSetupModal.tsx`)**:
   - The backend TOTP 2FA endpoints (`POST /api/v1/mfa/setup` and `POST /api/v1/mfa/verify`) and the login MFA challenge screen ([`client/src/app/login/page.tsx`](../../client/src/app/login/page.tsx)) are fully implemented.
   - Furthermore, [`client/src/components/settings/MfaSetupModal.tsx`](../../client/src/components/settings/MfaSetupModal.tsx) is already written and wired to `/mfa/setup` and `/mfa/verify`—but it is **never imported or mounted** in [`client/src/app/profile/page.tsx`](../../client/src/app/profile/page.tsx). As a result, no user can ever enable MFA from the UI!
2. **Missing Notification UI for Teacher Announcements**:
   - Teachers can broadcast bilingual announcements to their students via [`AnnouncementManager.tsx`](../../client/src/components/teacher/AnnouncementManager.tsx) (`POST /api/v1/teacher/announcements`), which creates `Notification` rows in Postgres.
   - The backend exposes `GET /api/v1/notifications/me` and `PATCH /api/v1/notifications/:id/read` ([`notification.routes.ts`](../../server/src/modules/notifications/notification.routes.ts)), but there is **zero frontend UI** to display or mark notifications as read.

---

## 2. Files to Create & Modify

| File | Action | Purpose |
| :--- | :---: | :--- |
| [`server/src/modules/auth/auth.service.ts`](../../server/src/modules/auth/auth.service.ts) | Modify | Ensure `getProfile` returns `mfaEnabled: Boolean(user.mfaEnabled)` so `/profile` knows whether 2FA is active. |
| [`client/src/app/profile/page.tsx`](../../client/src/app/profile/page.tsx) | Modify | Add a "Security & Two-Factor Authentication (2FA)" section displaying current MFA status (`Enabled` / `Not Enabled`) and a button that opens `MfaSetupModal`. |
| [`client/src/components/settings/MfaSetupModal.tsx`](../../client/src/components/settings/MfaSetupModal.tsx) | Modify | Support passing `currentPassword` and `currentToken` when re-enrolling if `mfaEnabled` is already `true` (matching `mfa.controller.ts` security rules). |
| `client/src/components/NotificationBell.tsx` | Create | Lightweight notification bell button & dropdown popover in the top navbar for authenticated users, calling `GET /notifications/me` and `PATCH /notifications/:id/read`. |
| [`client/src/components/Navbar.tsx`](../../client/src/components/Navbar.tsx) | Modify | Mount `<NotificationBell />` next to the user profile / language toggle when `user` is logged in. |

---

## 3. Step-by-Step TDD Implementation Guide

### Step 1: Write Failing Tests First (`Red` Phase)

1. In [`server/src/modules/auth/__tests__/profile.integration.spec.ts`](../../server/src/modules/auth/__tests__/profile.integration.spec.ts):
   - Assert that `GET /api/v1/auth/profile` includes `mfaEnabled: false` initially and `mfaEnabled: true` after completing TOTP verification.
2. In [`server/src/modules/notifications/__tests__/notification.integration.spec.ts`](../../server/src/modules/notifications/__tests__/notification.integration.spec.ts):
   - Verify that when a teacher posts an announcement via `POST /api/v1/teacher/announcements`, the enrolled student receives it in `GET /api/v1/notifications/me` (`isRead: false`) and can mark it read via `PATCH /api/v1/notifications/:id/read` (`isRead: true`).

---

### Step 2: Implement the Backend & Frontend Wiring (`Green` Phase)

#### 2.1 Return `mfaEnabled` from `AuthService.getProfile`
In [`server/src/modules/auth/auth.service.ts`](../../server/src/modules/auth/auth.service.ts):
- Include `mfaEnabled: true` in the `select` clause of `getProfile(userId)`.

#### 2.2 Mount `MfaSetupModal` in `client/src/app/profile/page.tsx`
In [`client/src/app/profile/page.tsx`](../../client/src/app/profile/page.tsx):
- Track `const [mfaEnabled, setMfaEnabled] = useState(false)` and `const [showMfaModal, setShowMfaModal] = useState(false)`.
- Render a Security card below the profile form showing a badge (`2FA Enabled` in emerald or `2FA Disabled` in amber) and a button (`Configure 2FA` / `Re-enroll 2FA`) that opens `<MfaSetupModal isOpen={showMfaModal} onClose={() => setShowMfaModal(false)} onSuccess={() => setMfaEnabled(true)} />`.

#### 2.3 Create `NotificationBell.tsx` & Mount in `Navbar.tsx`
Create `client/src/components/NotificationBell.tsx`:
- Fetches `GET /notifications/me` when authenticated.
- Shows a bell icon (`Bell` from `lucide-react`) with an unread count badge (`notifications.filter(n => !n.isRead).length`).
- Clicking opens a dropdown listing bilingual notifications (`dir === 'rtl' ? n.titleAr : n.titleEn`) and marks unread items as read on click via `PATCH /notifications/${n.id}/read`.

---

### Step 3: Refactor & Cleanup (`Refactor` Phase)

Ensure `NotificationBell` respects RTL/LTR layout alignment (`right-0` in LTR, `left-0` in RTL) and closes on Escape or outside click.

---

## 4. Code Review Checklist

- [ ] Does `GET /api/v1/auth/profile` return `mfaEnabled` (and **never** `mfaSecret`)?
- [ ] Is `MfaSetupModal.tsx` mounted on `/profile` and able to complete QR code setup and 6-digit verification?
- [ ] Is `NotificationBell.tsx` mounted in `Navbar.tsx` for authenticated users, showing unread badge counts and marking notifications read via `PATCH /api/v1/notifications/:id/read`?

---

## 5. Verification & Test Commands

```bash
cd server
npx vitest run src/modules/auth/__tests__/profile.integration.spec.ts src/modules/notifications
npm run typecheck

cd ../client
npm run typecheck
npm run lint
npm run build
```
