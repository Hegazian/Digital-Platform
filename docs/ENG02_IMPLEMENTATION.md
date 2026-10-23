# ENG-02 implementation evidence

Status: **In Progress** on `codex/milestone-1`. This file records local implementation and verification; it does not claim branch CI or deployment.

The [23 October M1 review](M1_REVIEW.md) found two open regressions owned here: **M1-R02**, non-atomic config update/readback, and **M1-R03**, saving one subject discards other subjects' pricing drafts. Passing the existing stale-version test does not cover the readback interleaving. Resolve both and add the named regressions before accepting this task. Fresh verification is recorded separately in [M1 evidence](../audit/m1-review/verification.json).

## Implemented

- Added `AppConfig.version` with an additive migration. Existing rows start at version 1; legacy non-EGP config currency values are normalized to EGP while their configured USD display rate is preserved.
- `PUT` and `PATCH /api/v1/config` require `expectedVersion`, reject unknown fields and non-EGP currencies, and use a conditional version increment. A stale concurrent edit gets `409 CONFIG_VERSION_CONFLICT`. The intended success contract is the exact saved row and next version; current separate readback can return a later writer's version (M1-R02).
- Kept EGP as the only charge currency in the admin UI and API. The USD exchange rate is labeled indicative. The UI submits only writable config fields and sends the returned version on the next save.
- Course and subscription price writes accept EGP only; supplying `priceUsd` is rejected. Teacher/admin pricing forms no longer offer an editable USD amount.
- Course and subscription catalog USD equivalents are derived from the current rate on read. Removed process-local exchange-rate caching, so a new rate applies across API instances immediately.
- Existing order EGP snapshots remain authoritative; this change does not rewrite or reprice product or order history.

## Local verification

- `npm run db:migrate:fixture` — passed empty install and repeated deploy, drift rejection before migration history, and populated upgrade. The fixture retained 22 rows across 21 tables and verified legacy AppConfig currency becomes EGP, version starts at 1, and a saved rate of 60 remains 60.
- `npm test -- src/modules/config/__tests__/config-branding.spec.ts src/modules/config/config.test.ts` — 2 files / 9 tests passed, including unauthorized writes, strict unknown fields, non-EGP rejection, fresh rate readback and a concurrent stale-write race.
- Focused course/subject/config/validation tests — 6 files / 39 tests passed, including fresh-rate catalog output, USD price input rejection and stale-write concurrency. Course/subject route integration subset — 3 files / 15 tests passed.
- Full server `npm test` — 80 files / 437 tests passed.
- Server `npm run typecheck` and `npm run build` — passed.
- Client `npm run typecheck`, `npm test`, and `npm run build` — passed; 15 test files / 81 tests passed.
- Client `npm run lint` — 0 errors and 27 existing warnings in other files.
- The first migration attempt against the preexisting disposable test schema returned Prisma P3005 because it has no reviewed baseline history. No baseline SQL was applied. The allowlisted disposable test target was synchronized using the repository-guarded `npm run db:push:test`; the isolated migration fixture then passed against fresh per-run schemas.

## Manual admin concurrency check

1. Start the API and client against the disposable local database and sign in as an admin.
2. Open Platform Settings in two browser sessions. In both, confirm the currency is fixed to EGP and the exchange-rate label says it is indicative.
3. In session A, change the rate to `50`, save, reload, and confirm the value remains `50` and the returned config version increased by one.
4. In session B, change the rate using the stale form and save. Confirm the API returns `409 CONFIG_VERSION_CONFLICT` with a reload/retry message and does not overwrite session A's value.
5. Reload session B and save a valid setting again. Confirm the latest version is accepted.
6. Create or edit a course and a subject plan. Confirm the form accepts EGP only and catalog USD equivalents update after changing the indicative rate.
7. In Arabic and English student catalog/checkout journeys, confirm the displayed charge remains the same EGP product/order amount after changing the indicative rate. Do not submit a real payment as part of this check.

## Remaining acceptance

- Resolve M1-R02 with atomic update/response semantics and a barrier-controlled real PostgreSQL regression. Resolve M1-R03 with subject-scoped result reconciliation and draft-preservation component/browser tests.
- Run exact branch CI after this task's changes are reviewed and pushed.
- Perform the admin conflict and student display journey in both locales in a browser. The build and API tests do not prove the browser flow.
- Review order snapshots after an exchange-rate change in the commerce regression fixture; no live/purchased record should be rewritten.
- Keep ENG-02 In Progress until this evidence is attached to the reviewed commit.
