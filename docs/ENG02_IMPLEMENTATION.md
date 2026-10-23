# ENG-02 implementation evidence

Status: **In Progress** on `codex/milestone-1`. This file records local implementation and verification; it does not claim branch CI or deployment.

The [23 October M1 review](M1_REVIEW.md) found two regressions owned here: **M1-R02**, non-atomic config update/readback, and **M1-R03**, saving one subject discards other subjects' pricing drafts. Both are fixed with real-PostgreSQL and component regressions. This follow-up also verifies that the product catalog recomputes indicative USD after a rate change while an existing order retains its original EGP and USD snapshots. Arabic/English component tests cover the Platform Settings rate control, saved EGP contract, localized stale-write conflict, checkout amount and subject pricing submission. With the final Playwright request-fixture version, both desktop locale cases passed; the earlier equivalent run also passed both Pixel 5 cases. The local runner did not exit during teardown and was interrupted, so the complete browser suite still needs a clean run. ENG-02 remains In Progress for that full browser evidence and exact-head CI. Fresh verification is recorded separately in [M1 evidence](../audit/m1-review/verification.json).

## Implemented

- Added `AppConfig.version` with an additive migration. Existing rows start at version 1; legacy non-EGP config currency values are normalized to EGP while their configured USD display rate is preserved.
- `PUT` and `PATCH /api/v1/config` require `expectedVersion`, reject unknown fields and non-EGP currencies, and use a conditional version increment. A stale concurrent edit gets `409 CONFIG_VERSION_CONFLICT`. The conditional update and exact-row readback run in the same transaction, so each successful response carries the row and version written by that request (M1-R02).
- Kept EGP as the only charge currency in the admin UI and API. The USD exchange rate is labeled indicative. The UI submits only writable config fields and sends the returned version on the next save.
- Course and subscription price writes accept EGP only; supplying `priceUsd` is rejected. Teacher/admin pricing forms no longer offer an editable USD amount.
- Course, subject and active product catalog USD equivalents are derived from the current rate on read. Removed process-local exchange-rate caching, so a new rate applies across API instances immediately.
- Order EGP and USD totals are immutable checkout-time snapshots. An exchange-rate change updates current product display conversion but does not rewrite historic order amounts.
- Subject pricing saves reconcile only the server-confirmed subject and retain unrelated drafts plus newer values typed during the request (M1-R03).

## Local verification

- `npm run db:migrate:fixture` — passed empty install and repeated deploy, drift rejection before migration history, and populated upgrade. The fixture retained 22 rows across 21 tables and verified legacy AppConfig currency becomes EGP, version starts at 1, and a saved rate of 60 remains 60.
- `npm test -- src/modules/config/__tests__/config-branding.spec.ts` — 7 tests passed, including the explicit real-PostgreSQL config barrier and an order-snapshot regression across a rate change.
- Focused course/subject/config/validation tests — 6 files / 39 tests passed, including fresh-rate catalog output, USD price input rejection and stale-write concurrency. Course/subject route integration subset — 3 files / 15 tests passed.
- Full server `npm test` — 80 files / 441 tests passed.
- Server `npm run typecheck` and `npm run build` — passed.
- Client `npm run typecheck`, `npm test`, and `npm run build` — passed; 17 test files / 88 tests passed, including Arabic/English Platform Settings saves, checkout EGP display and subject pricing submission.
- Client `npm run lint` — 0 errors and 27 existing warnings in other files.
- Targeted production Playwright config journey — both English/Arabic desktop cases passed with the final request fixture; an earlier test-helper version also passed both Pixel 5 cases. The process did not exit after the cases; it was interrupted during teardown and the disposable fixture was recovered manually. This is targeted case evidence, not a successful full browser command or actual-device acceptance.
- The first migration attempt against the preexisting disposable test schema returned Prisma P3005 because it has no reviewed baseline history. No baseline SQL was applied. The allowlisted disposable test target was synchronized using the repository-guarded `npm run db:push:test`; the isolated migration fixture then passed against fresh per-run schemas.

## Manual admin concurrency check

1. Start the API and client against the disposable local database and sign in as an admin.
2. Open Platform Settings in two browser sessions. In both, confirm the currency is fixed to EGP and the exchange-rate label says it is indicative. Repeat in English and Arabic; save a rate in each locale and confirm the localized success state.
3. In session A, change the rate to `50`, save, reload, and confirm the value remains `50` and the returned config version increased by one.
4. In session B, change the rate using the stale form and save. Confirm the API returns `409 CONFIG_VERSION_CONFLICT` with a reload/retry message and does not overwrite session A's value.
5. Reload session B and save a valid setting again. Confirm the latest version is accepted.
6. Create or edit a course and a subject plan. Confirm the form accepts EGP only and catalog USD equivalents update after changing the indicative rate.
7. In Arabic and English student catalog/checkout journeys, confirm the displayed charge remains the same EGP product/order amount after changing the indicative rate. Component regressions cover locale labels and amount presentation; repeat this with real API data in the browser. Do not submit a real payment as part of this check.

## Remaining acceptance

- Run exact branch CI after this task's changes are reviewed and pushed.
- Rerun the complete production and development Playwright suites after resolving or isolating the local browser-runner teardown stall. Then perform student catalog/charge display in both locales; the targeted admin config journey does not cover student checkout.
- Keep ENG-02 In Progress until this evidence is attached to the reviewed commit.
