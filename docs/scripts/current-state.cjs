/* Current delivery state. Historical audit and checkpoint artifacts are never rewritten. */
const evidence = require('../../audit/final-m0/verification.json');
const m1 = require('../../audit/m1-review/verification.json');
const date = m1.date;
const implementationCommit = evidence.implementationCommit;
const latestReliabilityCommit = evidence.remoteCI.headRevision;
const latestReliabilityRun = evidence.remoteCI.url;
const latestReliabilityRunId = latestReliabilityRun.split('/').pop();
const waves = [
  { name: '1 — Migration baseline and independent reliability', ids: ['ENG-05', 'ENG-06', 'ENG-09', 'ENG-02'], outcome: 'Close M1-R01 upload lifetime, M1-R04 browser fixtures and M1-R02/R03 config/pricing regressions first. ENG-05 and ENG-06 have historical M0 CI; finish representative restore/recovery and real storage/process rehearsals. Complete ENG-09 transport/device acceptance using known READY fixtures and ENG-02 bilingual acceptance. ENH-03 owns subsequent processing.', proof: 'Exact-head remote CI; ENG-05 restored-copy diff/restore rehearsal; ENG-06 real storage outage and process signal/drain tests; ENG-09 real upload, bounded memory, scan, cleanup, playback/range and target-device tests; ENG-02 migration fixture, stale-write conflict, rate readback and bilingual admin/student EGP display.' },
  { name: '2 — Shared data, identity and commerce primitives', ids: ['ENH-01', 'ENH-02', 'ENG-07', 'COM-03', 'COM-05', 'COM-09', 'SEC-07', 'SEC-13', 'SEC-14'], outcome: 'After ENG-05, establish curriculum metadata, shared contracts, audit/outbox, subscription terms, scoped idempotency, effective dates, bank ownership and atomic session/MFA behavior.', proof: 'Schema/contract and preservation checks; real PostgreSQL races for token/code consumption, payment intent and calendar boundaries; cross-account bank tests.' },
  { name: '3 — Foundation integration', ids: ['ENG-04', 'LRN-07', 'ENG-08', 'COM-01', 'COM-02', 'COM-06', 'ENG-14', 'ENH-03'], outcome: 'Integrate route validation, canonical modules, side-effect-free reads, shared access, renewal, recoverable payment transitions, client session recovery and managed private media. Each task starts only when its own dependencies are Complete.', proof: 'Legacy IDs/progress/previews retained; all grant-source/date decisions agree; paid-but-unfulfilled recovery; actual private storage/upload/scan/range and tab/session failure tests.' },
  { name: '4 — Visibility, learning authorization and products', ids: ['SEC-06', 'SEC-12', 'COM-07'], outcome: 'Apply the shared policy to visibility and every discussion/assignment/bank surface; validate products and snapshot explicit access durations.', proof: 'Guest/student/teacher/admin visibility and cross-account matrix; effective access tests; invalid product rejection and historical duration preservation.' },
  { name: '5 — Pricing and G1 evidence', ids: ['COM-11'], outcome: 'Finish atomic course pricing and purchase-history preservation, then review every G1 criterion. This wave does not by itself complete the G3 paid checkout/voucher workflow.', proof: 'Concurrent price edits/purchases preserve snapshots; all M1 task acceptance and G1 evidence reviewed, with no migration, access, storage or session gaps.' }
];

function taskUpdate(t) {
  if (t.status === 'Complete') return 'The M0 engineering/containment deliverable is complete at **' + implementationCommit + '**, including the follow-up regressions. See [current verification](../CURRENT_STATUS.md), [first review](../M0_REVIEW_RESOLUTION.md) and [second review](../M0_REVIEW_ROUND_2.md). Retain these regression checks. Deployment-specific credential, private-storage, scanner and restore evidence remains an explicit traffic hold; full acceptance scenarios below are not all claimed as executed.';
  const notes = {
    'ENG-02': "M1 implements strict EGP config/pricing, expectedVersion and persisted indicative rates with an additive AppConfig.version migration. M1-R02 (non-atomic update/readback) and M1-R03 (saving one subject discards another pricing draft) are Open and owned here. Existing stale-write tests do not establish exact saved-response/version atomicity. Resolve both and add real PostgreSQL interleaving and component regressions. Fresh checks pass: 437 server and 81 client tests, typechecks, both builds, lint 0 errors / 27 warnings, and the migration fixture preserving 22 rows across 21 tables. See [review/regressions](../M1_REVIEW.md), [evidence](../ENG02_IMPLEMENTATION.md) and [manual checks](../M1_MANUAL_TESTING.md). Exact M1 commit CI, bilingual browser and order-preservation evidence remain required.",
    'COM-06': 'The M0 integration validates optional checkout expectedCourseId against voucher scope before consuming the code, and the checkout UI confirms actual course access before success. Wrong-course attempts retain usage and grants unchanged. COM-08 retains ownership of durable per-student voucher idempotency and global capacity races; COM-06 owns payment transitions, fulfillment and reconciliation. The context guard alone does not complete either task.',
    'SEC-14': 'The M0 integration exposes initial MFA enrollment in the profile but refuses replacement of an already enabled factor with HTTP 409. Opening or cancelling setup cannot disable an existing authenticator. Initial setup uses a conditional write against disabled MFA. Pending-factor replacement, secret encryption, replay/verification races, recovery and full session atomicity remain owned by this task; the availability guard is not a completed factor-replacement workflow.',
    'ENH-17': 'The compatible main integration replaces estimated teacher revenue with paid order totals for COURSE products owned by that teacher. Subject/grade bundle revenue is deliberately unallocated until a reviewed attribution rule exists, avoiding double-counting shared subjects. This partial correction does not complete ledger reconciliation, refunds, editorial/learning metrics, or bilingual analytics acceptance.',
    'ENG-13': "The guarded PostgreSQL harness, whole-source reporting, component tests, browser jobs and advisory policy are implemented. Fresh 23 October M1 checks pass: 437 server and 81 client tests, both builds and reviewer typechecks, migration fixture, lint 0 errors / 27 warnings. See [review/evidence](../M1_REVIEW.md). M1-R01–R04 regressions, M1-specific browser acceptance, full-source G3 coverage, concurrency/domain breadth and actual devices remain open. M0 coverage/advisory and CI browser results remain historical, attributed to their recorded revision. Use [coverage gaps](../../audit/final-m0/coverage-gaps.json) and [next steps](../NEXT_STEPS.md); retain release thresholds.",
    'ENG-05': `The exact branch Node 22 run [${latestReliabilityRunId}](${latestReliabilityRun}) for commit ${latestReliabilityCommit} passed all five checks, including API migrations/fixture and production/development browser jobs. The historical 2fbdc8e schema has a checked-in baseline and the reviewed follow-up is the M0 auth-version bridge. The local PostgreSQL fixture also passes empty installation, deliberate drift rejection before history write, exact pre-M0 adoption, historical 21-row preservation, authVersion=1, schema parity, repeat deploy and two simultaneous runs. ENG-05 remains In Progress until an authorized representative restore, rollback/forward-repair rehearsal and operator review of the runbook are complete. See [migration evidence](../ENG05_IMPLEMENTATION.md) and the [runbook](../NEXT_STEPS.md#eng-05-operational-follow-through).`,
    'ENG-06': `Implemented process-only /health/live and bounded /health/ready probes for PostgreSQL plus the selected storage backend; database/storage failure returns 503 with safe status-only dependency details, and shutdown marks readiness down before draining. Production requires explicit STORAGE_DRIVER=supabase and refuses local fallback; signal handling stops HTTP admission, drains connections to a deadline, then disconnects Prisma. Its 37-test/7-file focused suite passed with server typecheck and build, and exact-head Node 22 CI [${latestReliabilityRunId}](${latestReliabilityRun}) passed all five checks for ${latestReliabilityCommit}. The repository has no durable job dispatcher yet; ENG-07 owns outbox/dispatch, and integration with a dispatcher remains open. Real Supabase outage, process-level signal rehearsal and browser outage UX remain open.`,
    'ENG-09': "M1 adds private disk-staged 500 MiB uploads, bounded signature/scan/storage streams, accurate PROCESSING feedback and protected range delivery. M1-R01 and M1-R04 are Open. R04 requires READY fixtures and attachment isolation for the retained browser tests; never enable playback of unprocessed uploads. R01: response disconnect after body completion can release admission while its scan continues; the intended two-upload/1 GiB active-data bound is not established. Fix cancellation/work lifetime and add the exact disconnect/admission regression. Existing focused and full package suites pass. See [review](../M1_REVIEW.md), [transport evidence](../ENG09_IMPLEMENTATION.md) and [manual checks](../M1_MANUAL_TESTING.md). Finish measured load/cleanup, real Supabase/scanner and known verified READY fixture device playback. ENG-09 closes transport acceptance; dependent ENH-03 owns new-upload probing/processing/READY and complete A29/G1 media acceptance. No production rollout or legacy mass migration is claimed.",
    'ENG-14': 'M0 follow-up fixes already cover protected profile/me refresh, single-flight renewal, retryable versus terminal failures, malformed navigation cookies, logout landing and stale course responses. Preserve those tests. Token-family/tab races, complete identity-scoped recovery and all SEC-13 integration acceptance remain planned; see [RR-04–RR-06 and RR-10–RR-12](../M0_REVIEW_ROUND_2.md).',
    'LRN-12': 'M0 now guards stale course/enrollment responses and preserves playback state across failed grant renewal/retry. These partial compatibility repairs do not complete bounded persisted watch progress, cross-device resume or mastery/completion semantics.',
    'LRN-16': 'M0 repaired persisted Arabic hydration and mobile profile/logout overlap; the expanded desktop/mobile smoke suite passes. Full Arabic/English labels, authoring/assessment/payment flows, keyboard/screen-reader and actual-device acceptance remain planned.',
    'LRN-05': 'Admin course inspection now loads protected curriculum lazily and handles loading, failure, retry and stale responses. Immutable draft/published revisions, exact-revision approval and edit concurrency remain planned.',
    'LRN-06': 'Uploaded code samples are now readable as inert Arabic/English-presented content while execution remains API-disabled. A complete ordered renderer for all supported block types and accessible error/preview behavior remains planned.',
    'ENH-03': 'M0 already protects legacy delivery, binds assignment upload references, checks file signatures/scanning and rejects public/unverifiable production buckets. Managed asset IDs, resumable uploads, quotas, durable processing workers, completion verification and legacy-asset migration remain planned.'
  };
  return (notes[t.id] || 'This task remains **Planned**. Its original finding below describes the audit baseline, not a fresh claim that every branch remains defective. Before implementation, verify the current code against the named acceptance cases, preserve M0 repairs, and implement the remaining task scope under its registered owner.') + ' Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation.';
}

function writeStatusAndNext({write,tasks}) {
  const browserResult = mode => { const r=m1.browser[mode]; return ['passed','failed'].includes(r.status) ? (r.passed ?? r.tests)+' passed / '+(r.failed ?? 0)+' failed / '+r.skipped+' skipped; '+r.status+(r.note ? ' — '+r.note : '') : r.status; };
  const counts = Object.fromEntries(['Complete','In Progress','Planned'].map(s=>[s,tasks.filter(t=>t.status===s).length]));
  const byId = new Map(tasks.map(t=>[t.id,t]));
  const link = id => `[${id}](tasks/${id}.md)`;
  const ready = tasks.filter(t=>t.milestone==='M1' && t.status!=='Complete' && t.dependencies.every(id=>byId.get(id).status==='Complete'));
  const cov = k => { const c=evidence[k].coverage; return ['statements','branches','functions','lines'].map(d=>c[d].pct+'%').join(' / '); };
  write('docs/CURRENT_STATUS.md', `# Current implementation status

Documentation refreshed **23 October 2026**. Reviewed M0 application and main-integration checkpoint: **${implementationCommit}** on codex/finalize-milestone-0. Original audit baseline: **2fbdc8e**; first M0 checkpoint: **fbe5fbf**. This page summarizes [historical M0 evidence](../audit/final-m0/verification.json), [the integration review](M0_FINAL_REVIEW.md) and the last recorded [reliability CI run](${latestReliabilityRun}) for **${latestReliabilityCommit}**. A prior run is never attributed to later code; final integration CI is recorded separately when available.

**M0 / G0 is complete for internal synthetic-data work. G1–G3 remain open; the product is not ready for real-student or paid production onboarding.** The current task inventory is **${tasks.length}: ${counts.Complete} Complete, ${counts['In Progress']} In Progress, ${counts.Planned} Planned**. ENG-02, ENG-05, ENG-06, ENG-09 and ENG-13 are In Progress. ENG-05's exact branch CI passed; representative backup/restore and rollback evidence remain open. ENG-02 local checks pass but M1-R02/R03 remain Open; exact M1 commit CI and bilingual browser acceptance remain. ENG-09 unit/API regressions pass but M1-R04 breaks retained browser fixtures and M1-R01 invalidates the hard active-scan/disk bound; load, Supabase/scanner and target-device acceptance remain open. ENH-03 owns subsequent managed processing. See [ENG-02 evidence](ENG02_IMPLEMENTATION.md), [ENG-05 evidence](ENG05_IMPLEMENTATION.md) and [ENG-09 evidence](ENG09_IMPLEMENTATION.md). No task is marked complete by documenting or passing only its local synthetic fixture.

## M1 verification — 23 October (current working tree)

[Review](M1_REVIEW.md), [manual instructions](M1_MANUAL_TESTING.md) and [machine-readable evidence](../audit/m1-review/verification.json) cover M1 changes against merge base 322d070. Source hashes identify the tested files before commit. **M1-R01–R04 are Open**; passing the current suites does not resolve them.

| M1 check | Fresh recorded result |
|---|---|
| M1 server tests | ${m1.server.files} files / ${m1.server.tests} tests passed |
| M1 client tests | ${m1.client.files} files / ${m1.client.tests} tests passed |
| M1 typechecks / production builds | Both packages passed |
| M1 client lint | ${m1.client.lint.errors} errors / ${m1.client.lint.warnings} warnings |
| M1 migration fixture | Passed; 3 migrations; 22 rows / 21 tables preserved; repeat deploy and schema parity |
| Retained production browser smoke | ${browserResult('production')} |
| Retained development browser smoke | ${browserResult('development')} |
| M1 exact commit remote CI | Required after commit/push; earlier M0 CI is historical |

M1-specific config/upload browser journeys, load measurements, real Supabase/ClamAV, representative restore/rollback and actual devices remain open. The coverage and advisory scans below are historical M0 evidence; neither was refreshed by this pass.

## Historical M0 verification — 22 October (sources stated below)

| Check | Recorded result |
|---|---|
| Server typecheck / production build | Passed / passed |
| Server tests | ${evidence.server.files} files / ${evidence.server.tests} tests passed |
| Client typecheck / production build | Passed / passed |
| Client tests | ${evidence.client.files} files / ${evidence.client.tests} tests passed |
| Client lint | ${evidence.client.lint.errors} errors / ${evidence.client.lint.warnings} warnings |
| Production browser in CI, real isolated API/PostgreSQL | ${evidence.browser.production.tests} passed / ${evidence.browser.production.skipped} skipped |
| Development browser in CI, next dev / Strict Mode | ${evidence.browser.development.tests} passed / ${evidence.browser.development.skipped} skipped |
| Server whole-source coverage, statements / branches / functions / lines | ${cov('server')} |
| Client whole-source coverage, statements / branches / functions / lines | ${cov('client')} |
| NPM audit, both runtime trees | 0 reported advisory packages; server 0 total; client 9 development-only exceptions |
| Migration install / populated-upgrade fixture | Passed locally in unique schemas in dedicated PostgreSQL test database; schemas cleaned up |
| Remote CI / production deployment | ${evidence.remoteCI?.summary || 'Final integration pending; earlier reliability CI passed for '+latestReliabilityCommit} / not performed |

Local API/client environment: Windows, Node 26.7.0. Both complete browser modes passed on GitHub Actions Linux/Node 22 at the reviewed application revision, using Chromium 156.0.8078.4, desktop and Pixel 5 emulation. Local runs initially lacked the required browser, then hit a sandbox denial for Google Fonts; unrestricted reruns subsequently passed all 24 checks in each mode (production 4.1 minutes, development 2.6 minutes). The evidence records each attempt separately. These runs do not establish Firefox/WebKit or actual Android/iOS device acceptance. The two browser modes execute the same 24 checks; they are not 48 distinct feature cases.

## Delivered and retained

- Uploader-driven scope, AI tutor/provider removal, safe admin provisioning and hard-off server controls for staged features.
- Current database-backed role/approval/activation/session-version enforcement; public catalog/protected curriculum separation; student-safe assessment serialization; authenticated teacher actor binding.
- Protected local files, signed uploader-bound submission references, signature/scanner checks and private-Supabase startup validation. Short-lived playback renewal and authenticated PDF/download delivery are covered locally.
- Dashboard capability presentation, admin curriculum inspection, cancellation handling, Next proxy convention, refresh recovery, mobile logout and stale-course/playback retry regressions are fixed. See the [second review](M0_REVIEW_ROUND_2.md) and [first review](M0_REVIEW_RESOLUTION.md).
- Safe isolated tests and CI definitions are present. ENG-05 adds a full exact pre-M0 schema baseline and the idempotent [auth-version bridge](../server/prisma/upgrades/m0-auth-version.sql) as a versioned migration. Empty installs and a populated synthetic prior-schema upgrade pass inside disposable schemas. Existing production databases have not been baselined; operators must verify a restored-copy diff before resolving history.

## Remaining evidence and release holds

The full-source release target is **80% statements/lines/functions and 75% branches**, enforced by each package's 'npm run test:coverage:release'. It is unmet. The [fresh gap inventory](../audit/final-m0/coverage-gaps.json) lists executable files without unit/component coverage; browser code is not instrumented, so this is not proof those components were never visited. Feature tests must establish behavior and durable state, not merely increase a percentage.

The nine client development advisory exceptions are owned by ENG-13 and expire **19 January 2027**; resolve them before paid release or expiry, whichever comes first. See the [dependency record](M0_DEPENDENCY_REVIEW.md). Zero reported runtime advisories is limited to the recorded lockfiles and scan date, not a security certification.

Before real traffic, preserve a successful remote CI run for the exact release commit; audit/rotate previously exposed deployment credentials; verify all three private Supabase origins and migrated object checksums; exercise real ClamAV clean/infected/unavailable/timeout cases; and rehearse representative database plus private-object backup/restore/rollback. Complete migrations, shared access/assets, reviewed authoring, assessments, progress, bilingual accessibility, manual commerce, consent/privacy/support and operations under [G1–G3](TESTING_RELEASE_GATES.md). Public source distribution requires an owner-approved license. These holds are not waived by committing M0.

Automated Paymob/Fawry, guardian portal, certificates, offline packs, realtime whiteboards, code execution and developer integrations remain server-disabled until their owning gates pass. Uploaders supply every educational text, media item, translation, caption and answer; technical upload processing does not create educational material.

## Current execution frontier

**M1 requires changes. Resolve M1-R01/R04 under ENG-09 and M1-R02/R03 under ENG-02 first; see [the review](M1_REVIEW.md).** ${link('ENG-05')} and ${link('ENG-06')} code and exact-head CI are green; both stay In Progress pending named operator/infrastructure rehearsals. Other dependency-ready M1 work is ${ready.filter(t=>!['ENG-05','ENG-06','ENG-09','ENG-02'].includes(t.id)).map(t=>link(t.id)).join(', ') || 'none beyond Wave 1'}. Continue ${link('ENG-13')} throughout M1–M3. The [next-steps handoff](NEXT_STEPS.md) defines the ordered waves and remaining acceptance evidence.
`);

  write('docs/NEXT_STEPS.md', `# Next implementation steps

Updated **23 October 2026**. M0/G0 is complete for internal synthetic-data work. The latest reliability commit **${latestReliabilityCommit}** is pushed and all five exact-head GitHub checks passed. ENG-05 and ENG-06 remain In Progress for external rehearsal evidence. M1 review found four Open P2 issues: M1-R01/R04 (ENG-09), M1-R02/R03 (ENG-02). [Review](M1_REVIEW.md), [fresh evidence](../audit/m1-review/verification.json) and [manual checks](M1_MANUAL_TESTING.md) define the immediate work. G1–G3 and production onboarding remain gated. Current verification and task counts are in [CURRENT_STATUS.md](CURRENT_STATUS.md).

## Start here

1. Retain the committed M0 regressions and review the [current status](CURRENT_STATUS.md), [target architecture](TARGET_ARCHITECTURE.md), [contracts](API_DATA_CONTRACTS.md) and [operations holds](MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold).
2. Resolve **M1-R01/R04** in ${link('ENG-09')}, then **M1-R02/R03** in ${link('ENG-02')}, with the regressions below. Existing suites pass but do not cover these failures. Complete config browser/order-preservation and transport load/storage/device acceptance, obtain exact M1 commit CI and retain all operational gates. ENH-03 owns new-upload-to-READY after ENG-09 transport acceptance; unverified new uploads stay PROCESSING.
3. Keep **${link('ENG-05')}** and **${link('ENG-06')}** In Progress while an authorized operator performs representative restore/rollback review and real storage outage/process shutdown rehearsals. Never apply generated baseline SQL to existing tables blindly.
4. Continue **${link('ENG-13')}** throughout: keep local gates green, add semantic domain/component/concurrency tests with each task, and work toward the existing release coverage target. Resolve development advisory exceptions before paid release or 19 January 2027.
5. Follow the M1 waves; complete each task's prerequisites and acceptance evidence. Review **G1** using real upgrade, private-storage, access, session and outage evidence; then advance to M2 authoring/learning and M3 manual paid pilot. Keep all staged features denied at the API.

## Immediate implementation packages

All four findings are Open. This pass reviewed application changes and updated documentation; it did not implement fixes. These subtasks use existing owners and do not add duplicate backlog IDs.

1. **ENG-09 / M1-R01 — upload lifetime.** Cancel on premature response close after multipart consumption, stop file/scanner streams, and coordinate admission release with work termination and cleanup. Add controlled slow-scanner tests for this exact interleaving, repeated cancellations alongside two active uploads, Windows/Linux cleanup and late-close safety. Finish maximum-size memory/disk, real storage/scanner, timeout/restart and known READY fixture device checks. See [required regressions](M1_REVIEW.md#required-regression-evidence).
2. **ENG-02 / M1-R02 — atomic config response.** Return exactly the row/version produced by the conditional save using a returning update or correctly isolated transaction. Add real PostgreSQL barriers and prove A's subsequent stale save conflicts after B changes config. Preserve strict EGP validation and historical order snapshots.
3. **ENG-02 / M1-R03 — preserve pricing drafts.** Reconcile the saved subject from the server response while retaining unrelated/newer edits, including input typed during save. Add two-subject success/failure/in-flight tests and Arabic/English browser checks. COM-11 continues to own atomic pricing and history.
4. **ENG-09 / M1-R04 — restore browser evidence.** Seed known supported READY media through guarded test setup, isolate attachments and preserve renewal/pause/position/speed assertions. Normal uploads must still return PROCESSING and deny early playback. Rerun both browser modes without treating sandbox font failures as M1 defects.
5. **Evidence and review.** Rerun targeted regressions, package checks and retained production/development browser jobs. Collect exact-commit CI after an authorized push; keep M1-specific browser acceptance separate from smoke results. Close each finding after focused review and its regressions pass. Finish ENG-05/06 rehearsals below; task statuses remain In Progress until their acceptance is satisfied.
6. **Unlock Wave 2.** Once ENG-05's operator gate closes, start ENH-02 shared contracts and ENH-01 taxonomy, then the remaining Wave 2 primitives according to each task's prerequisites. Consumers reuse these contracts and policies.

### ENG-09 / ENH-03 acceptance boundary

ENH-03 depends on ENG-09, ENG-05, ENG-06, ENG-07, ENH-02 and completed SEC-02/03 controls. ENG-09 therefore closes transport acceptance with known verified READY fixtures, staging/scan/storage limits, ranges and truthful new-upload PROCESSING state. It does not wait for ENH-03 renditions. ENH-03 then owns managed assets, resumable completion verification, durable quotas/workers, codec/duration checks and READY transitions, including complete new-upload A29/G1 acceptance. Never mark unverified media READY merely to pass a playback test.

## ENG-05 operational follow-through

Owner: database migrations and operations. Status: **In Progress**, priority **P1**. See the [full task](tasks/ENG-05.md), [implementation evidence](ENG05_IMPLEMENTATION.md) and [migration runbook](MIGRATION_OPERATIONS.md). Code, local fixtures and exact-head CI are complete; representative restore/rollback/operator review remain open.

1. **Complete:** inventory the pre-M0/current schema difference; check in the immutable 2fbdc8e schema snapshot; generate and verify its baseline SQL; preserve the idempotent M0 authVersion bridge as the next migration. Existing production history is not marked as applied by CI or local tests.
2. **Complete:** add migrate-deploy/test commands and replace CI's schema-push setup with reviewed migration application. Guard schema push to local development or the dedicated test database.
3. **Complete locally:** the isolated fixture migrates an empty schema and verifies exact current-schema parity; builds the historical pre-M0 schema in a second unique schema; runs a read-only diff; seeds bilingual courses, grades, lessons, quiz/assessment attempts, assignment work/files, orders and entitlements; resolves the baseline; applies the bridge; and verifies every row and both auth versions survive a repeated deploy.
4. **Remaining:** verify a restored representative copy using the runbook's read-only diff and practice the migration-history adoption procedure, including code rollback/forward repair and before/after counts/checksums. Do not apply baseline create-table SQL to populated tables.
5. **Complete:** exact branch Node 22 CI passed all five checks for ${latestReliabilityCommit} in [GitHub Actions run ${latestReliabilityRunId}](${latestReliabilityRun}), including the server empty/populated migration fixture and both browser modes.
6. **Remaining:** restore an authorized representative copy, inspect it with read-only schema diff, rehearse baseline resolution plus rollback/forward repair and backup/restore, then obtain operator review before marking ENG-05 Complete.

First-task exclusions: no taxonomy, canonical course migration, managed asset schema, new commerce model or assessment revision engine in this baseline task. Those owners add their own subsequent ordered migrations. No production database changes are authorized by this planning document.

## M1 implementation waves

Waves respect the existing dependency graph; they are not dates or estimates. Within a wave, read each task's dependency list before starting. ENG-05 and ENG-06 remain In Progress pending representative database and real infrastructure rehearsals; ENG-02 and ENG-09 have Open review findings. ${tasks.filter(t=>t.milestone==='M1'&&t.status==='Planned').length} other M1 tasks remain Planned; ENG-13 also remains In Progress. Wave 1 is ready from the current completed-dependency set.

${waves.map(w=>`### Wave ${w.name}\n\n${w.ids.map(link).join(', ')}.\n\n${w.outcome}\n\nExit evidence: ${w.proof}`).join('\n\n')}

## Continuous verification and review

- Every implemented task adds meaningful positive/negative, cross-account, real database concurrency/recovery, migration and Arabic/English tests as applicable. Keep the 397-server/63-client and 24-per-mode browser checkpoint as historical regression evidence; record new counts for the new commit instead of treating them as a fixed test quota.
- Use [M0 manual steps](M0_MANUAL_TESTING.md) for current flows. Recheck disabled developer tabs with no requests, malformed cookies, transient refresh failures, protected course inspection, rapid PDF/course switches, failed video renewal retry, mobile profile/logout, enrollment and assignment delivery in both locales.
- Before local integration tests, verify the dedicated test target. Existing schema push is limited to local development and disposable test fixtures; install/upgrade workflows use reviewed migrations. Never use destructive fixture cleanup on a shared or real-student database.
- Preserve exact CI artifacts and coverage denominators. The [coverage inventory](../audit/final-m0/coverage-gaps.json) and [domain ownership table](TESTING_RELEASE_GATES.md#untested-and-incompletely-tested-domain-ownership) identify what still needs tests. Do not claim every feature tested because every dashboard tab opened.
- Regenerate docs using 'node docs/scripts/build-docs.cjs', validate using 'node docs/scripts/validate-docs.cjs', and update current evidence only when new checks actually run. Keep the 58 finding IDs, 42 acceptance dispositions and immutable archived originals.

## After M1

| Milestone | Delivery focus | Required exit evidence |
|---|---|---|
| M2 / G2 | Manual editors/import preview and atomic draft commit; exact teacher revision review; ordered accessible blocks and uploaded captions; frozen assessments/deadlines/manual grading; assignment/progress; bilingual journeys | Complete real author-to-review-to-student flow and domain test/compatibility evidence, with no automatic publication or educational generation |
| M3 / G3 | Verified manual payments, EGP vouchers/renewals/refunds/reconciliation; recovery/support; guardian consent and privacy/retention; accurate metrics; production monitoring, backups and limited pilot | All launch task dispositions reviewed, full-source coverage target met, current advisory policy, production canaries and restore/rollback signed off, exact remote CI pass and pilot owner |
| M4 / G4 | Automated providers, portal, certificates, offline packs, collaboration, isolated execution and developer integrations | Each independent feature implementation, security/device/provider tests and server enablement gate; containment stays active until then |

The complete list and ownership graph remain in [ROADMAP_BACKLOG.md](ROADMAP_BACKLOG.md). Product work continues to present uploader-supplied Egyptian educational content in Arabic and English.
`);
}

module.exports = {date,implementationCommit,evidence,m1,waves,taskUpdate,writeStatusAndNext};
