# M0 review round 2 — 22 October 2026

This follow-up starts from `fbe5fbf` on `codex/finalize-milestone-0`. The reported development logs exposed gaps in the first checkpoint's browser coverage. This round fixes the confirmed issues below and expands regression checks to dashboard tabs, navigation, session recovery and interrupted delivery. It does not certify the unimplemented M1–M4 features.

Implementation and verification were committed as **d9c720f**. The subsequent documentation refresh preserves the test artifacts below and links them from [current status](CURRENT_STATUS.md). Continue with [ENG-05 and the M1 execution plan](NEXT_STEPS.md); no additional application test run is implied by editing these documents.

## Findings and remedies

| ID / priority | Confirmed behavior and implementation | Owning task / regression |
|---|---|---|
| RR-01 / P2 | Admin and teacher developer panels mounted token/webhook controls even though the server denied those APIs. A read-only server capability snapshot now keeps these controls unmounted, with an Arabic/English unavailable notice. Missing/old config fails closed. [DeveloperTabs](../client/src/components/admin/DeveloperTabs.tsx), [server policy](../server/src/utils/capabilities.ts). | ENG-03 containment; ENG-12 future enablement. Component Strict Mode tests and admin/teacher browser tab checks assert zero developer requests; direct API denials remain tested. |
| RR-02 / P2 | Effect cleanup and document selection produced an API warning for intentional `AbortError` cancellation. [fetchApi](../client/src/lib/api.ts) propagates cancellation without logging it, while retaining genuine HTTP/network errors. `Headers` and multipart inputs also retain their transport semantics. | SEC-02, ENG-13. Transport/body cancellation tests and a delayed-document browser scenario. |
| RR-03 / P2 | Next 16 emitted the middleware convention deprecation. [proxy.ts](../client/src/proxy.ts) now uses the supported filename/export. The migration follows the [Next documentation](https://nextjs.org/docs/messages/middleware-to-proxy). | ENG-13. Production build and development startup plus proxy unit/browser tests. |
| RR-04 / P2 | Malformed/unknown-role refresh-cookie hints redirected a student dashboard back to itself. The proxy now validates the navigation hint's shape, role and expiry before redirecting to a dashboard. API authentication remains authoritative; the decoded hint is not authorization. | ENG-14 partial repair. Missing/invalid/expired-cookie tests and role redirect/browser checks. |
| RR-05 / P1 | `/auth/profile` and `/auth/me` could not renew an expired access token because all auth-prefixed routes were excluded. Only credential/challenge/logout/refresh endpoints now suppress renewal. | ENG-14 partial repair. Protected profile/me retries and a real profile refresh/edit/reload journey. |
| RR-06 / P1 | Refresh 409/429/5xx responses destroyed the local session as if revoked. Only a definitive 401/403 ends the session; transient failures retain it. Concurrent requests still share one refresh. | ENG-14 partial repair. Status-table, malformed-response, revocation and concurrency tests. Token-family/tab-rotation redesign remains SEC-13/ENG-14 work. |
| RR-07 / P2 | Admin inspection treated the metadata-only course list as an empty curriculum. [CourseApprovalQueue](../client/src/components/admin/CourseApprovalQueue.tsx) now loads authorized details on inspection, displays loading/error/retry and ignores stale inspection responses. | SEC-04 compatibility; LRN-05/ENH-06 retain complete editorial workflows. The failing empty-curriculum tests were reproduced before repair; component and real admin browser inspection now exercise details. |
| RR-08 / P2 | The staged code block claimed its supplied sample was readable but hid the sample. [CodePlaygroundBlock](../client/src/components/editor/CodePlaygroundBlock.tsx) now renders the exact supplied code as inert text with localized availability copy and no execution control. | SEC-15 containment, LRN-06 presentation. English/Arabic tests assert readable code, no script execution and no API call. |
| RR-09 / P2 | On mobile, the profile/name region overlapped logout and intercepted pointer events. [Navbar](../client/src/components/Navbar.tsx) now bounds profile text, compacts the small-screen header and uses a keyboard-accessible profile button. | LRN-16, ENG-13. Reproduced in the mobile trace/screenshot; browser tests assert no horizontal overflow, a real logout click, removed cookie/token and login on protected navigation. |
| RR-10 / P2 | A slow previous course response could replace the newly selected course's curriculum. [VideoPlayerSection](../client/src/components/VideoPlayerSection.tsx) now invalidates stale requests and clears course-specific selection/progress/UI state on course or identity changes. | LRN-12, ENG-14. The out-of-order response test failed before the repair and now guards the selected curriculum. |
| RR-11 / P2 | A failed video grant renewal removed the video element, so a later retry lost playback position/speed. [usePlaybackSource](../client/src/lib/usePlaybackSource.ts) retains the last usable playback snapshot across failure and retry. | SEC-02 delivery, LRN-12 recovery. The failure/retry test failed before repair; paused/playing renewal and stale-lesson tests remain required. |
| RR-12 / P2 | Explicit logout navigated home while the protected-page guard simultaneously navigated to login. Both paths now use login, so the completed logout has a consistent destination. | ENG-14. Real logout tests wait for the server response, verify cookie/token removal and check the login form before revisiting a protected route. |

No removed AI feature or staged integration was enabled. Existing task IDs and the 58-finding/42-case audit lineage remain intact; these follow-up regressions are mapped to their existing owners rather than creating duplicate tasks.

## Verification record

The final machine-readable evidence is [verification.json](../audit/review-round-2/verification.json). Portable [server](../audit/review-round-2/server-coverage-summary.json) and [client](../audit/review-round-2/client-coverage-summary.json) reports retain actual whole-source denominators.

- Server: 77 files / 397 tests pass with coverage; typecheck/build pass.
- Client: 9 files / 63 tests pass with coverage; additional API/proxy per-file gates protect the renewed session and navigation behavior.
- Lint: 0 errors, 25 existing warnings. The warnings remain visible; no blanket suppression was added.
- Fresh NPM audit: passed on 22 October after explicit approval to send dependency metadata. Both runtime dependency trees have zero reported advisory packages; the server has zero total advisories. Nine client development-only exceptions remain under the existing owner/expiry policy in [the dependency record](M0_DEPENDENCY_REVIEW.md).
- Production browser: **24 passed, 0 skipped** on desktop and Pixel 5 emulation, Chromium 156.0.8078.4.
- Development browser: **24 passed, 0 skipped** on the same projects with `next dev`/Strict Mode. Cold first-dashboard navigation has a bounded 30-second test budget, separate from production performance acceptance. The middleware deprecation and reported API/cancellation warnings did not recur in these flows.
- Documentation integrity checks preserve all 77 tasks, 58 finding owners, 42 acceptance mappings and 13 exact archived originals.

The expanded browser suite visits every admin dashboard tab and every teacher workspace tab, checks actual course inspection, student profile editing/refresh, role redirects, logout, malformed cookies, document cancellation, English/Arabic enrollment/PDF/assignment delivery and real WebM grant renewal. It uses an actual local API and dedicated PostgreSQL database. Only the explicit cancellation scenario introduces a controlled network delay. Production and `next dev` runs are separate; development exercises React Strict Mode cleanup. CI has a separate job for each mode.

Intermediate failures were investigated rather than counted as passes: the mobile logout overlap was an application defect; the document setup needed explicit completed enrollment; logout assertions needed the completed server response and matching route destination; initial development navigation needed to wait for cold compilation. The final complete runs above passed after those corrections. Next's development process also created `client/AGENTS.md`; its bundled-doc guidance is retained, and its source in Next's generator was verified.

Expected negative tests deliberately produce server 401/403/503 records. Dashboard smoke tests fail on unexpected API responses, browser exceptions or console warnings/errors. They do not hide the negative assertions or treat a skipped feature as a pass.

## Remaining test and release gaps

[coverage-gaps.json](../audit/review-round-2/coverage-gaps.json) inventories production files without unit/component coverage and partial coverage by file. Browser code is not instrumented in these reports: a zero unit-coverage number is a gap in unit evidence, not proof that a browser never visited that component.

The G3 target of 80% statements/lines/functions and 75% branches over all production sources remains unmet, particularly on the client. Visiting every tab does not test every mutation, role combination, import format, payment/reconciliation race or accessibility/device behavior. ENG-13 stays In Progress; domain owners retain their detailed acceptance cases in [testing gates](TESTING_RELEASE_GATES.md#untested-and-incompletely-tested-domain-ownership).

Whole-source unit/component coverage (statements/branches/functions/lines) is **71.99/63.18/91.87/72.84% server** and **11.29/11.33/6.57/10.88% client**. API transport has 97.36% statement coverage and the proxy 94.59%, with explicit per-file CI floors. One server production file and 67 client production files with executable statements lack unit/component coverage; their exact paths and partial-file denominators are in the gap inventory. Browser-tested components are identified separately above.

Private Supabase origins, real ClamAV, production credentials/restore, actual iOS/Android devices, Firefox/WebKit, load/chaos tests and full paid-release/editorial workflows still require their named deployment/feature evidence. The [operations holds](MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold) and G1–G3 are unchanged. No production deployment or remote CI result is implied by this local review.

## Reproduce and manually check

Use the [step-by-step guide](M0_MANUAL_TESTING.md), including its `M0_WEB_MODE=dev` command. Restart the server and client after updating. In the admin dashboard, open API & Webhooks: an unavailable notice should appear without token/webhook requests. In a lesson, switch PDFs before loading completes: cancellation must not produce an API warning. On a mobile viewport, profile/language/logout controls must remain separately clickable. The old middleware deprecation must no longer appear on development startup.
