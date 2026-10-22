# M0 implementation status

Initial checkpoint finalized **21 October 2026** at **fbe5fbf**, with follow-up fixes verified **22 October** at **d9c720f**, on `codex/finalize-milestone-0`. **The M0 engineering/G0 checkpoint is complete for internal synthetic-data work.** G1–G3 and production onboarding remain gated. ENG-13 retains its broader release-coverage obligation as In Progress; its M0 harness/dependency subgate is complete. No production deployment, secret rotation or cloud-object migration is claimed.

All five follow-up review findings are fixed; see [review resolution](M0_REVIEW_RESOLUTION.md) and the [step-by-step manual guide](M0_MANUAL_TESTING.md).

**Latest review: 22 October 2026.** The [second review round](M0_REVIEW_ROUND_2.md) records twelve additional confirmed fixes and expanded dashboard/session/cancellation coverage. [Current status](CURRENT_STATUS.md) summarizes 397 server tests, 63 client tests and 24 browser checks in each of production/development modes. Only the explicitly labeled original-checkpoint section below preserves the earlier counts. **Next: [ENG-05 and the M1 handoff](NEXT_STEPS.md)**.

## Implemented in this working tree

- The agreed product direction is uploader-driven. AI tutoring endpoints/UI and provider wiring were removed; the remaining AI-named integration test verifies that legacy AI and raw upload endpoints are unavailable.
- Initial admin provisioning now requires explicit one-time environment opt-in and a unique email/password; safe course approval and staged feature controls are enforced in configuration and at server routes.
- Server capability guards keep code execution, collaborative boards, developer integrations, and automated payment gateways unavailable even if a legacy environment/config flag is set. The API-host Python execution implementation was removed.
- Authentication reloads current role, approval, activation and auth version from the database. Sensitive account changes advance authVersion and revoke refresh tokens; pending/rejected teachers are denied at login, MFA completion, refresh, and protected access. New accounts/tokens start at version 1; the additive SQL bridge retires pre-M0 sessions while retaining accounts/history.
- Teacher identity is taken from the authenticated request. Strict request schemas reject body-supplied teacher IDs on the affected teacher/live actions.
- Public catalog responses omit curriculum and protected lesson details; a separate protected learning route and playback URL checks control lesson delivery. Assessment routes disable caching and student assessment responses omit answer keys and private snapshots.
- Upload content checks validate extension, declared type and supported file signatures, and production upload paths fail closed without a responding ClamAV scanner. Public static serving of the uploads directory was removed; production storage refuses local fallback.
- Test setup and database scripts reject non-test or non-local database targets before setup/reset. CI now runs runtime dependency audits and removes secrets and execution-enabling variables from the test job.
- Assignment handlers call their static helpers through the class; schema/service upload references agree and require an uploader-bound signed token. Client links/PDFs use authenticated blob delivery. Enrollment/verified-checkout reload protected curriculum. Playback credentials renew before expiry and preserve pause/position/speed. Arabic state restores after hydration without a mismatch.
- Production startup refuses missing/public/unverifiable educational storage buckets. Disabled gateways no longer require production secrets. Framework/editor/runtime dependencies were patched and the source distribution metadata is private/UNLICENSED.

## Original checkpoint verification — 21 October

- Server: `npm run typecheck` and `npm run build` passed.
- Client: `npm run typecheck` and `npm run build` passed.
- Server full-source coverage run: `npm run test:coverage` passed, **77 files / 397 tests**, including HTTP byte delivery/denials, safe provisioning, scanner protocol, prior-schema upgrade and current authorization checks.
- Client: **4 files / 17 component/hook tests** passed with the delivery/playback coverage gates; lint passed with 0 errors and 26 reported warnings.
- Actual production-build API/DB Playwright suite: **10 desktop/mobile tests passed, 0 skipped**, including English/Arabic enrollment, PDFs, uploaded assignments, staged API denials, teacher approval policy and real WebM renewal. Local browser: Chrome 155 through Playwright; CI installs the matching Chromium build.
- Fresh dependency policy passed: **0 runtime advisory packages** in either app, 0 total server advisories, and 9 precisely scoped development-only client exceptions expiring 19 January 2027. [Report and decisions](M0_DEPENDENCY_REVIEW.md).
- Documentation links/IDs/dependencies/archive hashes are validated separately by `node docs/scripts/validate-docs.cjs`. GitHub Actions is configured with API coverage, client lint/component/build, documentation/advisory and M0 browser jobs; remote Actions execution is not claimed by local results.

## Task disposition

| Tasks | M0 evidence / disposition |
|---|---|
| SCOPE-01, SCOPE-02, ENG-01 | Revised uploader scope, removed tutor/provider surface, clean build/typechecks; Complete |
| SEC-01 | Safe seed/provisioning, no overwrite/implicit opt-in, auth-version upgrade; Complete engineering, live credential audit remains a traffic hold |
| SEC-02, SEC-03 | No raw static files, private delivery/boot gate, bound upload references, validated/scanned-before-write files; Complete engineering, production storage/scanner canaries remain required |
| SEC-04, SEC-05, SEC-08 | Catalog/learning separation, explicit safe quiz/assessment options/results and no-store delivery; Complete |
| SEC-09, SEC-10, SEC-11 | Actor binding, live DB policy/version checks and approval enforcement across auth paths; Complete |
| ENG-03, SEC-15 | Hard-off routes/UI and removed API-host execution; Complete containment, future enablement belongs to M4 owners |
| ENG-15 | Capability/runbook claims corrected; private/UNLICENSED metadata, public distribution owner decision recorded; Complete internal documentation |
| ENG-13 | M0 isolated harness, dependency triage, component/browser regressions and CI jobs complete; broader full-product coverage and G3 acceptance remain In Progress |

## Coverage and release limits

Latest 22 October results include all production TS/TSX files; tests are excluded deliberately. Backend: **71.99% statements, 63.18% branches, 91.87% functions, 72.84% lines**. Client: **11.29% statements, 11.33% branches, 6.57% functions, 10.88% lines**. These are whole-source unit/component results, not feature-completeness percentages. The [portable evidence](../audit/review-round-2/verification.json) and [gap inventory](../audit/review-round-2/coverage-gaps.json) retain denominators and uncovered paths.

The M0 server ratchet is 70/60/90/70 (statements/branches/functions/lines), with stricter per-file guards for current authorization, uploader token validation and scanning/signatures. Client protected-file, renewal, API transport and proxy paths have explicit gates. Exact current per-file results are in the [second review](M0_REVIEW_ROUND_2.md) and its reports. These narrow gates do not replace full-product coverage.

`npm run test:coverage:release` in each package retains the agreed **80% statements/lines/functions and 75% branches** G3 target. That target is **not met** and is an explicit paid-release hold. M1–M3 owners add the remaining feature tests; the broader legacy browser suite is opt-in and is not counted as passing M0 evidence.

## Production and later-release holds

1. Run the remote CI workflow for the committed branch and preserve its artifacts. Accumulate the remaining M1–M3 journeys and meet the full-source release target; the latest M0 suite has 24 browser checks passing in each mode without skips, which does not cover every feature.
2. In the deployment environment, rotate any previously used or exposed credentials; verify the deployed secrets and remove bootstrap credentials.
3. Provision the production private storage bucket and test that its origin denies anonymous reads; verify object migration and authorized playback/download end to end.
4. Provision ClamAV, run clean/infected/unavailable/timeout upload checks through the production upload route, and ensure the reverse proxy enforces upload size limits.
5. Run a migration/rollback rehearsal against a representative copy and record asset/user/history counts. The local `db:push:test` check only validated the dedicated test database.
6. Resolve the public source-distribution license before public distribution, and capture an operational release owner’s sign-off. Current private/UNLICENSED metadata grants no public distribution license.

These checks remain mandatory before real traffic under the [operations hold](MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold). They are not silently waived by the internal M0 checkpoint or the branch commit.
