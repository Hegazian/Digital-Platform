# M0 setup and manual verification

Use synthetic accounts and the local test/development database. These steps verify the M0 safety changes; full authoring, payments, imports and progress acceptance remain in their M1–M3 tasks.

Reviewed **22 October 2026**. The [current status](CURRENT_STATUS.md) records the tested integration revision, fresh suite counts and browser modes. Repeating these steps supplies evidence for your environment. After validating M0 locally, follow [ENG-05 and the M1 plan](NEXT_STEPS.md). Empty installs use the reviewed migration chain. Existing populated databases require the [read-only comparison and history-adoption runbook](MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold); never run baseline CREATE TABLE statements blindly.

## 1. Prepare the isolated automated environment

From `D:\digital platform`, start the dedicated database:

```powershell
docker compose up -d postgres-test
```

Create an ignored `server/.env.test` if it does not already exist, using only the disposable local database:

```dotenv
NODE_ENV=test
DATABASE_URL=postgresql://testuser:testpassword@localhost:5433/eduplatform_test?schema=public
DIRECT_URL=postgresql://testuser:testpassword@localhost:5433/eduplatform_test?schema=public
JWT_SECRET=m0_local_test_signing_key_at_least_32_characters
JWT_REFRESH_SECRET=m0_local_refresh_key_at_least_32_characters
```

These are disposable test values, not production secrets. Both database URLs must resolve to `localhost`, `127.0.0.1` or `::1`, with the exact database name `eduplatform_test`. Tests and reset helpers reject other targets before connecting. The test launcher selects `.env.test` explicitly; it does not use the development `.env` database.

```powershell
cd 'D:\digital platform\server'
npm ci
npx prisma generate
npm run db:migrate:test
npm run db:migrate:fixture
npm run typecheck
npm run test:coverage

cd 'D:\digital platform\client'
npm ci
npm run typecheck
npm run lint
npm run test:coverage
npx playwright install chromium
npm run test:m0:browser
```

The last command builds both apps, creates unique fixtures and private files, uses API port **5100** and web port **3100**, runs English/Arabic desktop/mobile journeys without skips, and removes only its own fixtures afterward. It must not run concurrently with the full API suite against the same test database. CI jobs use separate disposable databases.

Browser evidence is in `client/playwright-report/m0/`; failures also retain traces/screenshots in `client/test-results/`. For a visible, step-by-step replay use `npm run test:m0:browser -- --headed --debug --project=chromium` and Playwright Inspector. The legacy future-feature browser suite is separate and is not counted as M0 evidence.

The [22 October review round](archive/reviews/M0_REVIEW_ROUND_2.md) adds admin/teacher tab coverage, profile renewal/editing, mobile logout, malformed-cookie redirects and interrupted document loads. To run the same suite against `next dev`, including React Strict Mode cleanup:

```powershell
$env:M0_WEB_MODE='dev'
npm run test:m0:browser
Remove-Item Env:M0_WEB_MODE
```

Run production and development browser modes sequentially: both use ports 3100/5100 and the same dedicated test database. Restart any already running client/server after pulling code changes so the capability snapshot and `proxy.ts` migration take effect.

## 2. Prepare your own manual development session

Use `docker compose up -d postgres-dev` for `localhost:5434/eduplatform_dev`. Configure the ignored `server/.env` with both development URLs, separate random signing keys, blank Supabase configuration for protected local storage, and the intended client URL. Never overwrite an existing environment file without checking its target.

Run `npx prisma generate`, then `npm run db:push` only after verifying that this is the disposable development database. Run `npm run db:seed` for academic/subject metadata; it creates no login accounts. Provision a unique initial administrator once:

```powershell
$env:ALLOW_INITIAL_ADMIN_PROVISIONING='true'
$env:INITIAL_ADMIN_PASSWORD='<a new unique password of at least 12 characters>'
npm run create:admin -- your-local-admin@example.test 'Local Admin'
Remove-Item Env:ALLOW_INITIAL_ADMIN_PROVISIONING
Remove-Item Env:INITIAL_ADMIN_PASSWORD
```

The command refuses existing emails and never resets an existing account. Start the server with `npm run dev` in `server`, and the client with `npm run dev` in `client`. The usual ports are 5000/3000. Set `API_PROXY_TARGET` before building when using different API ports. Use only fake student/teacher data.

## 3. Check account and actor security

1. Create/approve teacher A and teacher B, and student A/B through the local admin/account flows. Pending and rejected teachers must receive 403 at password login; wrong passwords must not reveal approval state.
2. Sign in as a teacher, retain the access token in a separate test client, then reject/deactivate that account from the admin session. The old token must fail on its next protected request. Role/password/approval changes also revoke refresh tokens and advance `authVersion`.
3. In a local teacher announcement/live request, add another account's `teacherId`. Expect 400 and no announcement/session side effect. Valid requests take their actor from authentication.
4. Initial administrator provisioning without its explicit opt-in must fail; rerunning it with the same email must leave the account unchanged.
5. Open every admin and teacher dashboard tab. API & Webhooks / API & Docs shows a bilingual unavailable notice and sends no `/developer/tokens` or `/developer/webhooks` requests. Direct API calls remain denied by the server. Inspect a course as an admin: its actual modules/lessons must load, with an explicit error and retry if the detail request fails.
6. At a mobile width (393px or narrower), verify profile, language and logout controls remain individually clickable. Log out and revisit a dashboard; it must reach login. An invalid or expired refresh cookie must also reach login without a redirect loop.
7. With a valid refresh cookie, replace only the local access token with a disposable invalid value and open My Profile. Its request must refresh once, load the profile, save an edit and retain that edit after reload. A refresh 429/503 must preserve local session state; a definitive 401/403 ends the session.
8. In My Profile, enroll a disposable account in MFA and verify a valid authenticator code. Reload: the enabled indicator remains. Replacement is unavailable; calling `POST /api/v1/mfa/setup` again returns 409 and must leave the enabled flag and existing secret unchanged. Closing the dialog cannot disable MFA. Full factor replacement/recovery is SEC-14 work.
9. With two disposable active admins, concurrently deactivate/demote each through the other test session. One change must be rejected so at least one active admin remains. The PostgreSQL race regression forces both transactions to read the same initial count.

## 4. Check protected content and assignments

1. With a published free local course, sign in as a new student and enroll. The curriculum must appear immediately, without reloading. Verified checkout uses the same protected curriculum reload path; the component regression covers that callback while full commercial acceptance remains M3.
2. Open an attached PDF and download it. In DevTools Network, the content fetch must include `Authorization: Bearer …`; the iframe uses a temporary `blob:` URL. The API response is private/no-store. A direct guest request to the API content URL returns 401; another non-entitled student receives a denial.
3. Known `/uploads/...` URLs must return 404. The upload directory must not have a separate reverse-proxy/static alias.
4. Upload a PDF assignment response and submit it. The upload returns a relative `fileUrl` plus a signed `uploadToken`; submission accepts both. Confirm the response contains an authorized file-ID content URL. The submitting student and assigned grader can download it; another student cannot.
5. Remove/change the upload token, change its file path, or replay student A's upload from student B's account. Expect 400 and no extra submission. Upload tokens expire after 24 hours; re-upload after expiry. Existing historical submission records remain intact.
6. Read an assignment, read the lesson's assignment list, update it as its teacher, and grade a submission. Each request must succeed without the former unbound-class-method 500; response URLs remain protected.
7. Rename an HTML file to an allowed document/image extension or provide a mismatched MIME/signature. Expect 400. Production upload routes return 503 when ClamAV is absent/unavailable; a malware rejection returns 400 before storage. Protocol fixtures verify clean/rejected/invalid scanner responses locally. Real scanner canaries belong to the deployment checklist.
8. Attach a validated public HTTPS document: it remains a usable external link. A teacher's manual attachment request with a private submission/object key must fail. Newly uploaded private materials/videos must use their own resource-scoped keys; replacing that key with another resource's reference must produce a denial without bytes or a signed URL. Unverified legacy media remain recoverable but fail closed; use the [re-upload runbook](MIGRATION_OPERATIONS.md#private-media-object-binding-after-the-final-m0-review).
9. In a paid course checkout, try a voucher for another course. It must show an error, retain checkout and leave voucher usage/grants unchanged. The request includes the selected `expectedCourseId`. A matching voucher is consumed only for its applicable scope; access success follows the actual course entitlement check. Full idempotent/concurrent voucher acceptance remains COM-08/M3; payment recovery/reconciliation remains COM-06.

## 5. Check playback and locale persistence

1. Select an uploaded video, play, pause partway through and change speed. Leave it paused longer than two minutes, then resume/seek. The client renews the delivery URL about 30 seconds before expiry; its position, paused state and speed survive renewal. Network responses include an `expiresAt` instant. A revoked entitlement prevents subsequent renewal.
2. Switch lessons while a playback request is slow. A late response from the first lesson must not replace the newly selected lesson.
3. Switch to Arabic, hard-reload the course page, and repeat enrollment/material/assignment checks. The root element must have `lang="ar" dir="rtl"`; switching back restores English/ltr. The console must have no hydration error. Uploaded content translations remain the uploader's responsibility.
4. Throttle one course response, switch to a second course, then allow the first response to finish. The second course's curriculum and selected lesson must remain selected. After a failed playback renewal, retry once connectivity returns; pause, position and speed must survive.
5. Start loading one PDF and select another before it finishes. The new document must remain selected, with no `API Error … aborted` warning. Genuine server failures must still show an error. Staged code blocks must show the exact uploaded code sample as inert text, without a Run button or execution request.

## 6. Check removed and staged capabilities

Direct API calls to code execution, boards, developer integrations and Paymob/Fawry webhooks return 503 `FEATURE_DISABLED`, regardless of legacy flags or actor role. The legacy AI tutor endpoint returns 404 and the tutor UI/provider dependency is absent. Admin settings cannot turn off required course approval or enable the staged capabilities.

## 7. Keep production release evidence separate

M0 supports safe internal synthetic-data work. Before real traffic, complete [production and data-preservation checks](MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold) and G1–G3. Production startup verifies that all educational/submission Supabase buckets exist and are private. No production credentials, bucket settings, live malware scan or backup/restore result is implied by a local test pass.
