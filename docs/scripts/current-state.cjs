/* Current delivery state. Historical audit and checkpoint artifacts are never rewritten. */
const evidence = require('../../audit/review-round-2/verification.json');
const date = evidence.date;
const implementationCommit = 'd9c720f';
const waves = [
  { name: '1 — Migration baseline and independent reliability', ids: ['ENG-05', 'ENG-06', 'ENG-09', 'ENG-02'], outcome: 'Finish ENG-05 remote CI and representative restore/recovery evidence. In parallel where capacity permits, make readiness/shutdown honest, bound existing media/range handling, and persist validated configuration with EGP charge semantics.', proof: 'ENG-05 remote migration/fixture pass and restored-copy diff/restore rehearsal; outage/shutdown tests; range/disconnect tests; config reload and EGP assertions.' },
  { name: '2 — Shared data, identity and commerce primitives', ids: ['ENH-01', 'ENH-02', 'ENG-07', 'COM-03', 'COM-05', 'COM-09', 'SEC-07', 'SEC-13', 'SEC-14'], outcome: 'After ENG-05, establish curriculum metadata, shared contracts, audit/outbox, subscription terms, scoped idempotency, effective dates, bank ownership and atomic session/MFA behavior.', proof: 'Schema/contract and preservation checks; real PostgreSQL races for token/code consumption, payment intent and calendar boundaries; cross-account bank tests.' },
  { name: '3 — Foundation integration', ids: ['ENG-04', 'LRN-07', 'ENG-08', 'COM-01', 'COM-02', 'COM-06', 'ENG-14', 'ENH-03'], outcome: 'Integrate route validation, canonical modules, side-effect-free reads, shared access, renewal, recoverable payment transitions, client session recovery and managed private media. Each task starts only when its own dependencies are Complete.', proof: 'Legacy IDs/progress/previews retained; all grant-source/date decisions agree; paid-but-unfulfilled recovery; actual private storage/upload/scan/range and tab/session failure tests.' },
  { name: '4 — Visibility, learning authorization and products', ids: ['SEC-06', 'SEC-12', 'COM-07'], outcome: 'Apply the shared policy to visibility and every discussion/assignment/bank surface; validate products and snapshot explicit access durations.', proof: 'Guest/student/teacher/admin visibility and cross-account matrix; effective access tests; invalid product rejection and historical duration preservation.' },
  { name: '5 — Pricing and G1 evidence', ids: ['COM-11'], outcome: 'Finish atomic course pricing and purchase-history preservation, then review every G1 criterion. This wave does not by itself complete the G3 paid checkout/voucher workflow.', proof: 'Concurrent price edits/purchases preserve snapshots; all M1 task acceptance and G1 evidence reviewed, with no migration, access, storage or session gaps.' }
];

function taskUpdate(t) {
  if (t.status === 'Complete') return 'The M0 engineering/containment deliverable is complete at **' + implementationCommit + '**, including the follow-up regressions. See [current verification](../CURRENT_STATUS.md), [first review](../M0_REVIEW_RESOLUTION.md) and [second review](../M0_REVIEW_ROUND_2.md). Retain these regression checks. Deployment-specific credential, private-storage, scanner and restore evidence remains an explicit traffic hold; full acceptance scenarios below are not all claimed as executed.';
  const notes = {
    'ENG-13': 'The isolated PostgreSQL harness, whole-source reporting, client component tests, production/development browser jobs and dependency policy are implemented. The latest evidence is 397 server tests, 63 client tests and 24 browser checks per mode. Full-source G3 coverage, migration/concurrency/domain breadth, actual-device coverage and a successful remote CI run remain open. Use the [coverage-gap inventory](../../audit/review-round-2/coverage-gaps.json), domain owners and [next steps](../NEXT_STEPS.md); do not lower release thresholds to mark this Complete.',
    'ENG-05': 'A historical schema snapshot at 2fbdc8e now has a checked-in baseline; its reviewed follow-up migration is the idempotent M0 auth-version bridge. The disposable PostgreSQL fixture passes empty installation, rejects deliberate schema drift before writing migration history, verifies exact pre-M0 schema adoption, preserves 21 synthetic rows across learning/assessment/submission/payment tables, checks authVersion=1 and schema parity, and repeats deploy. CI now uses migrations and runs that fixture. ENG-05 remains In Progress until remote Node 22 CI, full restore/rollback rehearsal and operator review of the schema-diff/runbook procedure are complete. See [migration evidence](../ENG05_IMPLEMENTATION.md) and the [runbook](../NEXT_STEPS.md#first-implementation-task--eng-05).',
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
  const counts = Object.fromEntries(['Complete','In Progress','Planned'].map(s=>[s,tasks.filter(t=>t.status===s).length]));
  const byId = new Map(tasks.map(t=>[t.id,t]));
  const link = id => `[${id}](tasks/${id}.md)`;
  const ready = tasks.filter(t=>t.milestone==='M1' && t.status!=='Complete' && t.dependencies.every(id=>byId.get(id).status==='Complete'));
  const cov = k => { const c=evidence[k].coverage; return ['statements','branches','functions','lines'].map(d=>c[d].pct+'%').join(' / '); };
  write('docs/CURRENT_STATUS.md', `# Current implementation status

Documentation refreshed **22 October 2026**. Latest M0 application/browser regression checkpoint: **${implementationCommit}**, on codex/finalize-milestone-0. Original audit baseline: **2fbdc8e**; first M0 checkpoint: **fbe5fbf**. ENG-05's schema migration and populated fixture were separately executed against this working tree. This page summarizes [22 October machine-readable M0 evidence](../audit/review-round-2/verification.json); migration results are in [ENG-05 implementation evidence](ENG05_IMPLEMENTATION.md).

**M0 / G0 is complete for internal synthetic-data work. G1–G3 remain open; the product is not ready for real-student or paid production onboarding.** The current task inventory is **${tasks.length}: ${counts.Complete} Complete, ${counts['In Progress']} In Progress, ${counts.Planned} Planned**. ENG-05 and ENG-13 are In Progress: the migration fixture passes locally, while remote CI and representative backup/restore rehearsal remain open. See [ENG-05 evidence](ENG05_IMPLEMENTATION.md). No task is marked complete by documenting or passing only its local synthetic fixture.

## Latest local verification — 22 October

| Check | Recorded result |
|---|---|
| Server typecheck / production build | Passed / passed |
| Server tests | ${evidence.server.files} files / ${evidence.server.tests} tests passed |
| Client typecheck / production build | Passed / passed |
| Client tests | ${evidence.client.files} files / ${evidence.client.tests} tests passed |
| Client lint | ${evidence.client.lint.errors} errors / ${evidence.client.lint.warnings} warnings |
| Production browser, real local API/PostgreSQL | ${evidence.browser.production.tests} passed / ${evidence.browser.production.skipped} skipped |
| Development browser, next dev / Strict Mode | ${evidence.browser.development.tests} passed / ${evidence.browser.development.skipped} skipped |
| Server whole-source coverage, statements / branches / functions / lines | ${cov('server')} |
| Client whole-source coverage, statements / branches / functions / lines | ${cov('client')} |
| NPM audit, both runtime trees | 0 reported advisory packages; server 0 total; client 9 development-only exceptions |
| Migration install / populated-upgrade fixture | Passed locally in unique schemas in dedicated PostgreSQL test database; schemas cleaned up |
| Remote CI / production deployment | Configured, not verified remotely / not performed |

Local environment: Windows, Node 26.7.0; CI is configured for Node 22. Browser runs use Chromium 156.0.8078.4, desktop and Pixel 5 emulation. These runs do not establish Firefox/WebKit or actual Android/iOS device acceptance. The two browser modes execute the same 24 checks; they are not 48 distinct feature cases.

## Delivered and retained

- Uploader-driven scope, AI tutor/provider removal, safe admin provisioning and hard-off server controls for staged features.
- Current database-backed role/approval/activation/session-version enforcement; public catalog/protected curriculum separation; student-safe assessment serialization; authenticated teacher actor binding.
- Protected local files, signed uploader-bound submission references, signature/scanner checks and private-Supabase startup validation. Short-lived playback renewal and authenticated PDF/download delivery are covered locally.
- Dashboard capability presentation, admin curriculum inspection, cancellation handling, Next proxy convention, refresh recovery, mobile logout and stale-course/playback retry regressions are fixed. See the [second review](M0_REVIEW_ROUND_2.md) and [first review](M0_REVIEW_RESOLUTION.md).
- Safe isolated tests and CI definitions are present. ENG-05 adds a full exact pre-M0 schema baseline and the idempotent [auth-version bridge](../server/prisma/upgrades/m0-auth-version.sql) as a versioned migration. Empty installs and a populated synthetic prior-schema upgrade pass inside disposable schemas. Existing production databases have not been baselined; operators must verify a restored-copy diff before resolving history.

## Remaining evidence and release holds

The full-source release target is **80% statements/lines/functions and 75% branches**, enforced by each package's 'npm run test:coverage:release'. It is unmet. The [gap inventory](../audit/review-round-2/coverage-gaps.json) lists one executable server file and 67 executable client files without unit/component coverage; browser code is not instrumented, so this is not proof those components were never visited. Feature tests must establish behavior and durable state, not merely increase a percentage.

The nine client development advisory exceptions are owned by ENG-13 and expire **19 January 2027**; resolve them before paid release or expiry, whichever comes first. See the [dependency record](M0_DEPENDENCY_REVIEW.md). Zero reported runtime advisories is limited to the recorded lockfiles and scan date, not a security certification.

Before real traffic, preserve a successful remote CI run for the exact release commit; audit/rotate previously exposed deployment credentials; verify all three private Supabase origins and migrated object checksums; exercise real ClamAV clean/infected/unavailable/timeout cases; and rehearse representative database plus private-object backup/restore/rollback. Complete migrations, shared access/assets, reviewed authoring, assessments, progress, bilingual accessibility, manual commerce, consent/privacy/support and operations under [G1–G3](TESTING_RELEASE_GATES.md). Public source distribution requires an owner-approved license. These holds are not waived by committing M0.

Automated Paymob/Fawry, guardian portal, certificates, offline packs, realtime whiteboards, code execution and developer integrations remain server-disabled until their owning gates pass. Uploaders supply every educational text, media item, translation, caption and answer; technical upload processing does not create educational material.

## Current execution frontier

**Continue ${link('ENG-05')} through remote CI and restore/recovery evidence**, then start the following ready M1 tasks: ${ready.filter(t=>t.id!=='ENG-05').map(t=>link(t.id)).join(', ')}. Readiness means prerequisites permit starting, not that implementation or tests have passed. Continue ${link('ENG-13')} throughout M1–M3. The [next-steps handoff](NEXT_STEPS.md) defines the ordered waves and remaining ENG-05 evidence.
`);

  write('docs/NEXT_STEPS.md', `# Next implementation steps

Updated **22 October 2026** against the M0 application checkpoint **${implementationCommit}**. M0 internal engineering is complete; ENG-05 is In Progress with a local migration chain and populated-upgrade fixture. This is the remaining M1 handoff. Current verification, caveats and task counts are in [CURRENT_STATUS.md](CURRENT_STATUS.md). Production migration, remote CI and backup/restore remain open.

## Start here

1. Retain the committed M0 regressions and review the [current status](CURRENT_STATUS.md), [target architecture](TARGET_ARCHITECTURE.md), [contracts](API_DATA_CONTRACTS.md) and [operations holds](MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold).
2. Complete **${link('ENG-05')} before starting dependent schema features**. The reviewed baseline and disposable populated upgrade fixture now pass locally. Obtain the remote Node 22 run, inspect a restored representative database with a read-only diff, and complete the rollback/restore rehearsal. Never apply generated baseline SQL to existing tables blindly.
3. Continue **${link('ENG-13')}** throughout: keep local gates green, obtain a remote Node 22 CI result, add semantic domain/component/concurrency tests with each task, and work toward the existing release coverage target. Resolve development advisory exceptions before paid release or 19 January 2027.
4. Follow the M1 waves below; complete each task's own prerequisites and acceptance evidence. Independent work may overlap, but dependent schema/API work must consume the owning implementation.
5. Review **G1** using real upgrade, private-storage, access, session and outage evidence; then advance to M2 authoring/learning and M3 manual paid pilot. Keep all staged features denied at the API.

## First implementation task — ENG-05

Owner: database migrations and operations. Status: **In Progress**, priority **P1**. See the [full task](tasks/ENG-05.md), [implementation evidence](ENG05_IMPLEMENTATION.md) and [migration runbook](MIGRATION_OPERATIONS.md). The original missing DIRECT_URL example has already been corrected in M0; do not repeat that as an unresolved defect. The exact pre-M0 baseline, auth-version migration and local fixture are implemented. Remote CI and representative restore/rollback/operator review remain open.

1. **Complete:** inventory the pre-M0/current schema difference; check in the immutable 2fbdc8e schema snapshot; generate and verify its baseline SQL; preserve the idempotent M0 authVersion bridge as the next migration. Existing production history is not marked as applied by CI or local tests.
2. **Complete:** add migrate-deploy/test commands and replace CI's schema-push setup with reviewed migration application. Guard schema push to local development or the dedicated test database.
3. **Complete locally:** the isolated fixture migrates an empty schema and verifies exact current-schema parity; builds the historical pre-M0 schema in a second unique schema; runs a read-only diff; seeds bilingual courses, grades, lessons, quiz/assessment attempts, assignment work/files, orders and entitlements; resolves the baseline; applies the bridge; and verifies every row and both auth versions survive a repeated deploy.
4. **Remaining:** verify a restored representative copy using the runbook's read-only diff and practice the migration-history adoption procedure, including code rollback/forward repair and before/after counts/checksums. Do not apply baseline create-table SQL to populated tables.
5. **Remaining:** obtain successful remote Node 22 CI for this implementation, inspect all migration artifacts and task acceptance evidence, and rehearse an actual database backup/restore before marking the task Complete.

First-task exclusions: no taxonomy, canonical course migration, managed asset schema, new commerce model or assessment revision engine in this baseline task. Those owners add their own subsequent ordered migrations. No production database changes are authorized by this planning document.

## M1 implementation waves

Waves respect the existing dependency graph; they are not dates or estimates. Within a wave, read each task's dependency list before starting. ENG-05 is In Progress and ${tasks.filter(t=>t.milestone==='M1'&&t.status==='Planned').length} other M1 tasks remain Planned; ENG-13 also remains In Progress. Only wave 1 is ready from the current completed-dependency set.

${waves.map(w=>`### Wave ${w.name}\n\n${w.ids.map(link).join(', ')}.\n\n${w.outcome}\n\nExit evidence: ${w.proof}`).join('\n\n')}

## Continuous verification and review

- Every implemented task adds meaningful positive/negative, cross-account, real database concurrency/recovery, migration and Arabic/English tests as applicable. Keep the 397-server/63-client and 24-per-mode browser checkpoint as historical regression evidence; record new counts for the new commit instead of treating them as a fixed test quota.
- Use [M0 manual steps](M0_MANUAL_TESTING.md) for current flows. Recheck disabled developer tabs with no requests, malformed cookies, transient refresh failures, protected course inspection, rapid PDF/course switches, failed video renewal retry, mobile profile/logout, enrollment and assignment delivery in both locales.
- Before local integration tests, verify the dedicated test target. Existing schema push is limited to local development and disposable test fixtures; install/upgrade workflows use reviewed migrations. Never use destructive fixture cleanup on a shared or real-student database.
- Preserve exact CI artifacts and coverage denominators. The [coverage inventory](../audit/review-round-2/coverage-gaps.json) and [domain ownership table](TESTING_RELEASE_GATES.md#untested-and-incompletely-tested-domain-ownership) identify what still needs tests. Do not claim every feature tested because every dashboard tab opened.
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

module.exports = {date,implementationCommit,evidence,waves,taskUpdate,writeStatusAndNext};
