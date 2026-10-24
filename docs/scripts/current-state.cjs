/* Current delivery state. Historical audit and checkpoint artifacts are never rewritten. */
const fs = require('node:fs');
const path = require('node:path');
const evidence = require('../../audit/final-m0/verification.json');
const m1 = require('../../audit/m1-review/verification.json');
const date = '2026-10-24';
const closureFile = path.resolve(__dirname, '../../audit/m1-closure/verification.json');
const closure = fs.existsSync(closureFile) ? JSON.parse(fs.readFileSync(closureFile, 'utf8')) : null;
const implementationCommit = evidence.implementationCommit;
const latestReliabilityCommit = evidence.remoteCI.headRevision;
const latestReliabilityRun = evidence.remoteCI.url;
const latestReliabilityRunId = latestReliabilityRun.split('/').pop();
const currentMigrationCount = fs.readdirSync(path.resolve(__dirname, '../../server/prisma/migrations'), { withFileTypes: true }).filter(entry => entry.isDirectory()).length;
function latestReviewSummary() {
  if (!closure) return 'The latest review is being verified; no new success is inferred.';
  return `The [13-task review](M1_PROGRESS_REVIEW.md) records findings M1-R06–R24 and their repairs. [Fresh verification](../audit/m1-closure/verification.json) binds the checks to normalized source hashes.\n\n| Current local check | Result |\n|---|---|\n| API full suite / coverage ratchet | ${closure.server.files} files / ${closure.server.tests} tests passed; command exit ${closure.server.coverageExitCode} |\n| Web full suite | ${closure.client.files} files / ${closure.client.tests} tests passed |\n| Whole-source coverage, statements / branches / functions / lines | API ${closure.server.coverage.join(' / ')}; web ${closure.client.coverage.join(' / ')} |\n| Typechecks / builds | Both apps pass; independent contracts build and ${closure.contracts.tests} package checks pass |\n| Client lint | ${closure.client.lint.errors} errors / ${closure.client.lint.warnings} existing warnings |\n| Production / development browser journeys | ${closure.browser.production} / ${closure.browser.development} passed, desktop and Pixel emulation, including English/Arabic MFA and one-use recovery |\n| Migration install / populated upgrade | ${closure.migrations.count} migrations; ${closure.migrations.rows} rows / ${closure.migrations.tables} tables preserved; drift rejection and repeat deployment pass |\n| Maximum-size local uploads | Two 500 MiB uploads; about ${Math.round(closure.load.rssIncreaseBytes / 1048576)} MiB RSS increase; third request 503; staging cleaned |\n| Advisory policy | No runtime advisory packages; ${closure.dependencies.developmentExceptions} development-only client advisories covered by the existing expiring policy |\n\nThe local load measurement uses a protocol fixture scanner and filesystem; actual Supabase/ClamAV and physical devices remain unverified. Matching-commit Linux CI, representative restore/rollback, MFA deployment key/legacy transition and the unfinished contract/consumer work remain release holds. Tasks with open acceptance are kept In Progress.`;
}
const waves = [
  { name: '1 — Migration baseline and independent reliability', ids: ['ENG-05', 'ENG-06', 'ENG-09', 'ENG-02'], outcome: 'The M1-R01–R04 code regressions and full local desktop/mobile browser acceptance now pass. ENG-05 and ENG-06 have historical M0 CI; ENG-06 also has a POSIX process-level SIGTERM regression awaiting Linux CI. Finish the restored-copy review and real storage/upload shutdown rehearsals. ENG-02 still needs exact-head CI and task-specific manual acceptance. Complete ENG-09 transport/device acceptance using known READY fixtures. ENH-03 owns subsequent processing.', proof: 'Exact-head remote CI; ENG-05 restored-copy diff/restore rehearsal; ENG-06 stalled-readiness SIGTERM process test on Linux plus real storage outage and upload drain tests; ENG-09 real upload, bounded memory, scan, cleanup, playback/range and target-device tests; ENG-02 migration fixture, stale-write conflict, rate readback, immutable order snapshots, bilingual browser admin/student EGP display and manual saved-state checks.' },
  { name: '2 — Shared data, identity and commerce primitives', ids: ['ENH-01', 'ENH-02', 'ENG-07', 'COM-03', 'COM-05', 'COM-09', 'SEC-07', 'SEC-13', 'SEC-14'], outcome: `${currentMigrationCount} additive migrations now include refresh-token families, encrypted MFA recovery state, course archive/retraction metadata, quiz/question-bank ownership and explicit free-enrollment provenance. Local COM-09 and COM-01 access-date primitives pass the populated fixture; finish ENH-02 executable shared contracts, ownership edge cases and production key/restore rehearsals before dependent access work is called complete.`, proof: 'Empty and populated migration fixture, real PostgreSQL token/MFA races, exact effective-date boundaries, archive versus retraction, cross-account quiz/question-bank controls, ENH-02 package compatibility and production key/restore evidence.' },
  { name: '3 — Foundation integration', ids: ['ENG-04', 'LRN-07', 'ENG-08', 'COM-01', 'COM-02', 'COM-06', 'ENG-14', 'ENH-03'], outcome: 'Finish the shared server-owned access decision and apply it across all protected learning surfaces, then complete route contracts, canonical modules, side-effect-free reads, renewal, recoverable payment transitions, client session recovery and managed private media.', proof: 'Legacy IDs/progress/previews retained; all grant-source/date decisions agree; paid-but-unfulfilled recovery; actual private storage/upload/scan/range and tab/session failure tests.' },
  { name: '4 — Visibility, learning authorization and products', ids: ['SEC-06', 'SEC-12', 'COM-07'], outcome: 'Finish visibility in catalog, subject and collection paths and verify access controls across discussions, assignments and question banks. Validate products and snapshot explicit access durations.', proof: 'Guest/student/teacher/admin visibility and cross-account matrix; effective access tests; archive/retraction concurrency; invalid product rejection and historical duration preservation.' },
  { name: '5 — Pricing and G1 evidence', ids: ['COM-11'], outcome: 'Finish atomic course pricing and purchase-history preservation, then review every G1 criterion. This wave does not by itself complete the G3 paid checkout/voucher workflow.', proof: 'Concurrent price edits/purchases preserve snapshots; all M1 task acceptance and G1 evidence reviewed, with no migration, access, storage or session gaps.' }
];

function taskUpdate(t) {
  if (t.status === 'Complete') return 'The M0 engineering/containment deliverable is complete at **' + implementationCommit + '**, including the follow-up regressions. See [current verification](../CURRENT_STATUS.md), [first review](../M0_REVIEW_RESOLUTION.md) and [second review](../M0_REVIEW_ROUND_2.md). Retain these regression checks. Deployment-specific credential, private-storage, scanner and restore evidence remains an explicit traffic hold; full acceptance scenarios below are not all claimed as executed.';
  if (closure?.tasks?.[t.id]) {
    const reviewed = closure.tasks[t.id];
    return `Reviewed in [the 24 October task review](../M1_PROGRESS_REVIEW.md), with [fresh verification](../../audit/m1-closure/verification.json). ${reviewed.implemented} Remaining before task completion: ${reviewed.remaining} The task remains In Progress while that evidence or implementation is open.`;
  }
  const notes = {
    'ENG-02': `M1 implements strict EGP config/pricing, expectedVersion and persisted indicative rates with an additive AppConfig.version migration. M1-R02 and M1-R03 are resolved by a transactional exact-row readback and draft-preserving subject reconciliation. Real-PostgreSQL barriers and order-snapshot regressions pass; current product USD display follows the latest rate while existing order amounts remain unchanged. English/Arabic Platform Settings, localized conflict feedback, pricing and checkout component checks pass. Current full suites: ${m1.server.files} server files/${m1.server.tests} tests and ${m1.client.files} client files/${m1.client.tests} tests; typechecks/builds pass and lint has ${m1.client.lint.errors} errors/${m1.client.lint.warnings} warnings. Production and development/Strict Mode browser suites freshly passed 32/32 each after the shutdown/staging-cleanup follow-up, including bilingual admin conflict and student EGP checkout flows on desktop/Pixel emulation. ENG-02 remains In Progress for exact-head CI and task-specific manual acceptance. See [review/evidence](../M1_REVIEW.md), [implementation evidence](../ENG02_IMPLEMENTATION.md) and [manual checks](../M1_MANUAL_TESTING.md).`,
    'COM-06': 'The M0 integration validates optional checkout expectedCourseId against voucher scope before consuming the code, and the checkout UI confirms actual course access before success. Wrong-course attempts retain usage and grants unchanged. COM-08 retains ownership of durable per-student voucher idempotency and global capacity races; COM-06 owns payment transitions, fulfillment and reconciliation. The context guard alone does not complete either task.',
    'COM-09': 'Implemented nullable archive/retraction actor, reason and timestamp fields; effective entitlement/subscription predicates require start <= now < expiry; archive blocks discovery, checkout and free enrollment while preserving a current buyer grant; admin retraction is reasoned and audited atomically and blocks student learning. Course checkout locks the lifecycle row to serialize archive/retraction with new orders. Local boundary, lifecycle integration and populated-migration tests are in progress. Representative restore and operational review remain release gates.',
    'COM-01': 'Added a server-owned AccessPolicy decision with grant source, expiry and capabilities, used by the existing resolver compatibility methods for course and subject access. Access checks now include future start dates and retraction, and direct free enrollment records FREE_ENROLLMENT. The ENH-02 shared API contracts and a complete consumer audit remain prerequisites before this policy can be marked complete.',
    'ENH-02': 'A private @eduplatform/contracts workspace package now provides strict shared Zod request/error/course-catalog schemas and inferred API types consumed by both apps. Server validation, catalog allowlisting and focused contract tests pass. Still required: full C01–C10 coverage, endpoint migration across both applications, generated OpenAPI, independent package build and compatibility checks.',
    'SEC-06': 'Catalog/search filtering now exposes only published PUBLIC courses; UNLISTED courses remain reachable by direct ID; PRIVATE course metadata requires manager or effective access; subject and collection course lists exclude non-public/retracted records. API integration cases cover catalog and direct-detail behavior. Finish the full role/visibility matrix and remaining discovery surfaces before completion.',
    'SEC-07': 'Standalone quizzes and question pools now persist an optional creator owner; teachers can read answer keys or mutate a bank only when they own it or own its attached course. Legacy rows without an owner remain admin-only for bank editing and do not reveal standalone answer keys to teachers. Additive ownership migration and cross-account tests are implemented. Verify all quiz attempt, assessment and UI paths before completion.',
    'SEC-12': 'A shared course-learning guard now protects assignment detail/list/submit and discussion list/create/reply routes. Assignment and discussion cross-account HTTP tests exercise denial; quiz assessment ownership is handled by SEC-07. Continue auditing material, board, progress and file delivery consumers against the central policy.',
    'SEC-13': 'Refresh tokens now have family and parent identity plus consumedAt; refresh conditionally consumes the old token and creates one successor in the same transaction. Near-simultaneous losers receive a retryable conflict without revoking another session; delayed replay revokes only the compromised family. A real-PostgreSQL 20-request race and browser Web Locks/cross-tab retry tests pass. Exact-head CI and deployed-browser acceptance remain open.',
    'SEC-14': 'MFA secrets use versioned AES-256-GCM encryption; pending replacement leaves the current factor active; verification atomically claims the pending factor and accepted TOTP time step; recovery codes are single-use hashes; admin reset records a reason, increments authVersion and revokes refresh sessions. A guarded plaintext-secret migration script is prepared. Tests pass for encryption, replay races, recovery and reset. Production key provisioning/rotation, backup rehearsal and actual-browser/recovery acceptance remain open.',
    'ENH-17': 'The compatible main integration replaces estimated teacher revenue with paid order totals for COURSE products owned by that teacher. Subject/grade bundle revenue is deliberately unallocated until a reviewed attribution rule exists, avoiding double-counting shared subjects. This partial correction does not complete ledger reconciliation, refunds, editorial/learning metrics, or bilingual analytics acceptance.',
    'ENG-13': `The guarded PostgreSQL harness, whole-source reporting, component tests, browser jobs and advisory policy are implemented. Fresh M1 checks pass: ${m1.server.files} server files/${m1.server.tests} tests passed/${m1.server.skipped} skipped and ${m1.client.files} client files/${m1.client.tests} tests, package typechecks/builds, lint ${m1.client.lint.errors} errors/${m1.client.lint.warnings} warnings, and the migration fixture. The corrected process tests cover clean shutdown and a stalled dependency exit on Windows through test-only IPC; POSIX CI still delivers native SIGTERM. Production and development browser suites freshly passed 32/32 each after the follow-up shutdown/staging-cleanup code changes. The fresh coverage command runs all ${m1.server.tests} tests but exits 1 because functions are ${m1.server.coverage.functions.pct}% against the 90% threshold. Full-source G3 coverage, additional concurrency/domain breadth, actual devices and exact-head CI remain open. M0 coverage/advisory and prior CI results remain historical at their recorded revision. Use [coverage gaps](../../audit/m1-review/coverage-gaps.json) and [next steps](../NEXT_STEPS.md); retain release thresholds.`,
    'ENG-05': `The exact branch Node 22 run [${latestReliabilityRunId}](${latestReliabilityRun}) for commit ${latestReliabilityCommit} passed all five checks, including API migrations/fixture and production/development browser jobs. The historical 2fbdc8e schema has a checked-in baseline and the reviewed follow-ups now include M0 auth version, ENG-02 config version, SEC-13 token families, SEC-14 MFA recovery, COM-09 course lifecycle, SEC-07 content ownership and COM-01 access provenance. The local PostgreSQL fixture passes empty installation, drift rejection, exact pre-M0 adoption, preservation of 22 historical rows across 21 tables, schema parity and repeated deploy. ENG-05 remains In Progress until an authorized representative restore, rollback/forward-repair rehearsal and operator review of the runbook are complete. See [migration evidence](../ENG05_IMPLEMENTATION.md) and the [runbook](../NEXT_STEPS.md#eng-05-operational-follow-through).`,
    'ENG-06': `Implemented process-only /health/live and bounded /health/ready probes for PostgreSQL plus the selected storage backend; database/storage failure returns 503 with safe status-only dependency details, and shutdown marks readiness down before draining. Production requires explicit STORAGE_DRIVER=supabase and refuses local fallback. Shutdown drains HTTP for up to ten seconds, gives Prisma five more seconds, then forces a nonzero exit if cleanup fails or hangs. Startup and a six-hour janitor remove only regular .upload staging files older than 24 hours. M1-R05 is resolved: the process test asserts a draining 503, settles the stalled loopback database fixture and verifies clean exit. Windows uses a test-only child IPC signal event; POSIX uses native SIGTERM. The full server suite passes ${m1.server.tests} tests with no skips, including bounded shutdown and staging-retention regressions. Native Linux CI, real dependency outage/upload shutdown and operator review remain acceptance items. Exact-head Node 22 CI [${latestReliabilityRunId}](${latestReliabilityRun}) remains historical evidence for ${latestReliabilityCommit}. The repository has no durable job dispatcher yet; ENG-07 owns outbox/dispatch.`,
    'ENG-09': `M1 adds private disk-staged 500 MiB uploads, bounded signature/scan/storage streams, accurate PROCESSING feedback and protected range delivery. M1-R01 and M1-R04 regression findings are resolved: premature response close cancels the scanner/source and retains admission until cleanup, while guarded browser fixtures seed known supported READY media without changing normal PROCESSING behavior. Startup and six-hour janitor cleanup remove only regular .upload files older than 24 hours, preserving recent and unrelated entries. Fresh local evidence includes controlled-scanner admission/disconnect and stale-file retention regressions. Production and development/Strict Mode browser suites freshly passed 32/32 each after the shutdown and staging-cleanup follow-up. Finish measured maximum-size resource bounds, real Supabase/ClamAV behavior and actual-device playback. ENH-03 owns managed new-upload probing/processing/READY and complete A29/G1 media acceptance. No production rollout or legacy mass migration is claimed. See [review](../M1_REVIEW.md), [transport evidence](../ENG09_IMPLEMENTATION.md) and [manual checks](../M1_MANUAL_TESTING.md).`,
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
  const currentCov = k => { const c=m1[k].coverage; return c ? ['statements','branches','functions','lines'].map(d=>c[d].pct+'%').join(' / ') : 'Not measured'; };
  write('docs/CURRENT_STATUS.md', `# Current implementation status

Documentation refreshed **24 October 2026**. Reviewed M0 application and main-integration checkpoint: **${implementationCommit}** on codex/finalize-milestone-0. Original audit baseline: **2fbdc8e**; first M0 checkpoint: **fbe5fbf**. This page summarizes [historical M0 evidence](../audit/final-m0/verification.json), [the integration review](M0_FINAL_REVIEW.md) and the last recorded [reliability CI run](${latestReliabilityRun}) for **${latestReliabilityCommit}**. A prior run is never attributed to later code; final integration CI is recorded separately when available. Current SEC and dependency checks are local evidence bound to the normalized source manifest; a matching remote CI run is still required.

**M0 / G0 is complete for internal synthetic-data work. G1–G3 remain open; the product is not ready for real-student or paid production onboarding.** The current task inventory is **${tasks.length}: ${counts.Complete} Complete, ${counts['In Progress']} In Progress, ${counts.Planned} Planned**. All 13 In Progress tasks have a reviewed disposition in [the latest review](M1_PROGRESS_REVIEW.md). Local regressions, complete suites and maximum-size upload checks pass as recorded below; shared contract/consumer work and the remaining M1 foundation tasks still require implementation. Representative restore/rollback, real private storage/scanning, MFA deployment transition, physical devices and matching-commit CI remain open. ENH-03 owns subsequent managed media processing. See [ENG-02 evidence](ENG02_IMPLEMENTATION.md), [ENG-05 evidence](ENG05_IMPLEMENTATION.md) and [ENG-09 evidence](ENG09_IMPLEMENTATION.md). No task is marked complete by documenting or passing only its local synthetic fixture.

## Latest task review — 24 October

${latestReviewSummary()}

## M1 checkpoint verification — 23 October (historical)

[Review](M1_REVIEW.md), [manual instructions](M1_MANUAL_TESTING.md) and [machine-readable evidence](../audit/m1-review/verification.json) cover M1 changes against merge base 322d070. That evidence is a historical checkpoint; later SEC and prerequisite changes are recorded in the [current local security verification](../audit/sec-implementation/verification.json). **M1-R01–R04 are resolved by focused regressions**; the owning tasks remain in progress for broader acceptance and operational gates.

| M1 check | Fresh recorded result |
|---|---|
| M1 server tests | ${m1.server.skipped ? `${m1.server.files} files / ${m1.server.tests} passed / ${m1.server.skipped} skipped` : `${m1.server.files} files / ${m1.server.tests} tests passed`} |
| M1 client tests | ${m1.client.files} files / ${m1.client.tests} tests passed |
| M1 typechecks / production builds | Both packages passed |
| M1 client lint | ${m1.client.lint.errors} errors / ${m1.client.lint.warnings} warnings |
| Current server coverage, statements / branches / functions / lines | ${currentCov('server')} |
| Current client coverage, statements / branches / functions / lines | ${currentCov('client')} |
| M1 migration fixture | Fresh local fixture passed all ${currentMigrationCount} migrations, including empty install, drift rejection, populated upgrade with 22 rows / 21 tables preserved, repeat deploy, and schema parity |
| Retained production browser smoke | ${browserResult('production')} |
| Retained development browser smoke | ${browserResult('development')} |
| Bilingual admin conflict and student checkout journeys | Covered in fresh production/development browser suites (32/32 each; desktop and Pixel 5 emulation) |
| M1 exact commit remote CI | Required after commit/push; earlier M0 CI is historical |

M1-specific manual config/order checks, maximum-size load measurements, real Supabase/ClamAV, representative restore/rollback, actual devices and final-commit remote CI remain open. The current [coverage gaps](../audit/m1-review/coverage-gaps.json) are freshly measured; browser/child-process execution is not instrumented. The server coverage command runs every test but exits 1 because function coverage is 89.82% against the 90% threshold; the separate full server test command exits 0. Both packages remain below the G3 whole-product targets. Production/development browser suites were rerun successfully after the runtime follow-up, using desktop and Pixel 5 emulation. M0 coverage and advisory scans below remain historical; the advisory audit was not refreshed in this review. The [M1 release closure](M1_RELEASE_READINESS.md) lists every remaining task and acceptance hold.

## Initial SEC implementation checkpoint — 24 October (historical)

The historical M1 hashes above are retained without rewriting. The [fresh local report](../audit/sec-implementation/verification.json) records task-focused changes and checks for SEC-06/07/12/13/14 plus COM-09/COM-01/ENH-02 dependencies. The latest focused security suite passed 110 tests across 17 files, including regressions that block free-preview video and material access after retraction. Both app typechecks and production builds pass; client lint reports zero errors and 27 existing warnings. These local checks do not establish exact-head remote CI, a representative restore, production MFA key provisioning or browser acceptance; SEC tasks remain In Progress.

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

The full-source release target is **80% statements/lines/functions and 75% branches**, enforced by each package's 'npm run test:coverage:release'. It is unmet. The [current gap inventory](../audit/m1-closure/coverage-gaps.json) lists executable files without unit/component coverage; browser code is not instrumented, so this is not proof those components were never visited. Feature tests must establish behavior and durable state, not merely increase a percentage.

The ${closure?.dependencies.developmentExceptions ?? "unverified"} current client development advisory exceptions are owned by ENG-13 and expire **19 January 2027**; resolve them before paid release or expiry, whichever comes first. See the [fresh dependency record](../audit/m1-closure/dependencies/dependency-verification.json); the M0 scan remains historical. Zero reported runtime advisories is limited to the recorded lockfiles and scan date, not a security certification.

Before real traffic, preserve a successful remote CI run for the exact release commit; audit/rotate previously exposed deployment credentials; verify all three private Supabase origins and migrated object checksums; exercise real ClamAV clean/infected/unavailable/timeout cases; and rehearse representative database plus private-object backup/restore/rollback. Complete migrations, shared access/assets, reviewed authoring, assessments, progress, bilingual accessibility, manual commerce, consent/privacy/support and operations under [G1–G3](TESTING_RELEASE_GATES.md). Public source distribution requires an owner-approved license. These holds are not waived by committing M0.

Automated Paymob/Fawry, guardian portal, certificates, offline packs, realtime whiteboards, code execution and developer integrations remain server-disabled until their owning gates pass. Uploaders supply every educational text, media item, translation, caption and answer; technical upload processing does not create educational material.

## Current execution frontier

**All current review findings are repaired locally; M1/G1 is incomplete.** The [13-task review](M1_PROGRESS_REVIEW.md) records code delivery separately from unfinished acceptance. Continue ENH-02 endpoint/envelope adoption and COM-01 consumer parity next, then ENH-01 taxonomy and ENG-07 audit/outbox under the existing dependency graph. Keep representative restore, actual Supabase/ClamAV, production MFA transition/keys, physical devices and matching-commit Linux CI open. Use [the implementation order](NEXT_STEPS.md); ENG-13 continues through G3.
`);

  write('docs/NEXT_STEPS.md', `# Next implementation steps

Updated **24 October 2026**. The [review of all 13 In Progress tasks](M1_PROGRESS_REVIEW.md) records repaired findings M1-R06–R24, current implementation and explicit acceptance holds. [Fresh verification](../audit/m1-closure/verification.json) binds local checks to current source; earlier M0/M1 CI and test records stay historical. Current work uses local fixtures only. M1/G1 remains incomplete while shared endpoint adoption, the remaining foundation tasks and external release evidence are open. The current task inventory is in [CURRENT_STATUS.md](CURRENT_STATUS.md).

## Start here

1. Retain the committed M0 regressions and review the [current status](CURRENT_STATUS.md), [target architecture](TARGET_ARCHITECTURE.md), [contracts](API_DATA_CONTRACTS.md) and [operations holds](MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold).
2. Keep all repaired M1 regressions in CI. Fresh local production and development browser runs passed ${closure?.browser.production ?? "unverified"}/${closure?.browser.development ?? "unverified"} cases respectively, covering bilingual settings/checkout, MFA/recovery and cross-tab sessions alongside media/document journeys. The [maximum-size local upload benchmark](../audit/m1-closure/video-load.json) passed. Obtain matching-commit Linux CI and complete ${link('ENG-09')} real storage/scanner and physical-device acceptance. ENH-03 owns new-upload-to-READY after ENG-09 transport acceptance; unverified new uploads stay PROCESSING.
3. Keep **${link('ENG-05')}** and **${link('ENG-06')}** In Progress while an authorized operator performs representative restore/rollback review and real storage outage/upload shutdown rehearsals. Run the new POSIX SIGTERM process test on Linux CI. Never apply generated baseline SQL to existing tables blindly.
4. Continue **${link('ENG-13')}** throughout: keep local gates green, add semantic domain/component/concurrency tests with each task, and work toward the existing release coverage target. Resolve development advisory exceptions before paid release or 19 January 2027.
5. Follow the M1 waves; complete each task's prerequisites and acceptance evidence. Review **G1** using real upgrade, private-storage, access, session and outage evidence; then advance to M2 authoring/learning and M3 manual paid pilot. Keep all staged features denied at the API.

## Immediate implementation packages

M1-R01–R05 are fixed; [the earlier review](M1_REVIEW.md) preserves their checkpoint evidence. [The latest review](M1_PROGRESS_REVIEW.md) records M1-R06–R24 and a disposition for every In Progress task. The fixes reuse existing owners and do not add duplicate backlog IDs. Full ENG-02/ENG-09 completion and M1/G1 still require the remaining evidence below.

1. **ENG-09 / M1-R01 — completed regression.** Premature response close after body consumption aborts scanner/source work; staging cleanup and slot release await termination. A controlled HTTP/scanner test verifies two-slot admission, third-request rejection, cleanup and safe slot reuse. The exact maximum-size local benchmark now passes; real storage/scanner behavior and cross-platform CI remain open.
2. **ENG-02 / M1-R02 — completed regression.** The conditional update and exact-row readback share one transaction. Real-PostgreSQL barriers verify a competing stale write cannot replace the first response; API tests verify the response and persisted version match.
3. **ENG-02 / M1-R03 — completed regression.** Saving a subject preserves other drafts and edits typed during the request; component tests cover Arabic copy, RTL and server-confirmed pricing. Additional tests verify Arabic EGP submission, equal English/Arabic checkout charges and immutable order snapshots when the indicative rate changes. Fresh production and development browser suites verified bilingual admin conflicts and student checkout charges on desktop/Pixel emulation after the latest runtime follow-up. Exact-head CI and broader manual acceptance remain open.
4. **ENG-09 / M1-R04 — completed regression.** Guarded setup seeds a known supported READY video and isolates the renewal lesson. The latest production and development/Strict Mode desktop/mobile browser suites pass, as does the two-upload 500 MiB local benchmark. Ordinary uploads remain PROCESSING until verified; external storage/scanner and physical-device acceptance remain open.
5. **Evidence and release gates.** Keep the resolved finding regressions in CI. Collect exact-commit CI after the current branch commit is pushed; preserve the completed bilingual/order and local load checks, complete ENG-09 real storage/device acceptance, then finish the ENG-05/06 operator rehearsals below. Leave task statuses In Progress until their full acceptance criteria are evidenced.
6. **Continue Wave 2 locally.** The reviewed ENG-05 baseline and populated fixture are implemented and reverified. The local chain now includes SEC-13 refresh families, SEC-14 encrypted MFA, COM-09 lifecycle, SEC-07 ownership and COM-01 access provenance. Focused implementations and tests now cover SEC-06 visibility, SEC-07 ownership, SEC-12 learning guards (including preview retraction), SEC-13 and SEC-14. Continue full ENH-02 endpoint contracts and audit every remaining file/media/board/progress consumer before closing SEC-06/SEC-12. Keep ENG-05 In Progress for representative restore/operator acceptance; that release hold does not prevent preparing tested additive migrations in disposable schemas. Never deploy them to existing databases without the adoption review. Consumers reuse the owning contracts and policies.
7. **SEC security dependency order.** Continue SEC-07 against quizzes/question banks and their attempt surfaces. Finish COM-09/COM-01 and ENH-02 before closing SEC-06 visibility and SEC-12 learning-access enforcement; test every route and file/media delivery path with a second account. SEC-13/SEC-14 code is implemented locally, but retain their status until exact-head CI, deployed browser checks and MFA key migration/backup rehearsals are recorded.

8. **Next implementation slice: ENH-02 and COM-01.** Finish shared success/error envelopes and the existing catalog/learning/access consumers, including compatibility tests and generated path coverage. Preserve the current safe DTOs and policy decisions. Then implement ENH-01 taxonomy and ENG-07 audit/outbox, followed by the remaining commerce/curriculum/media tasks in the waves below. Do not activate staged APIs merely because a component schema exists.

### ENG-09 / ENH-03 acceptance boundary

ENH-03 depends on ENG-09, ENG-05, ENG-06, ENG-07, ENH-02 and completed SEC-02/03 controls. ENG-09 therefore closes transport acceptance with known verified READY fixtures, staging/scan/storage limits, ranges and truthful new-upload PROCESSING state. It does not wait for ENH-03 renditions. ENH-03 then owns managed assets, resumable completion verification, durable quotas/workers, codec/duration checks and READY transitions, including complete new-upload A29/G1 acceptance. Never mark unverified media READY merely to pass a playback test.

## ENG-05 operational follow-through

Owner: database migrations and operations. Status: **In Progress**, priority **P1**. See the [full task](tasks/ENG-05.md), [implementation evidence](ENG05_IMPLEMENTATION.md) and [migration runbook](MIGRATION_OPERATIONS.md). Baseline code and local fixtures are implemented; earlier checkpoint CI is linked below. The current M1 chain still needs final-commit CI, representative restore/rollback and operator review.

1. **Complete:** inventory the pre-M0/current schema difference; check in the immutable 2fbdc8e schema snapshot; generate and verify its baseline SQL; preserve the idempotent M0 authVersion bridge as the next migration. Existing production history is not marked as applied by CI or local tests.
2. **Complete:** add migrate-deploy/test commands and replace CI's schema-push setup with reviewed migration application. Guard schema push to local development or the dedicated test database.
3. **Complete locally:** the isolated fixture migrates an empty schema and verifies exact current-schema parity; builds the historical pre-M0 schema in a second unique schema; runs a read-only diff; seeds bilingual courses, grades, lessons, quiz/assessment attempts, assignment work/files, orders and entitlements; resolves the baseline; applies the bridge; and verifies every row and both auth versions survive a repeated deploy.
4. **Remaining:** verify a restored representative copy using the runbook's read-only diff and practice the migration-history adoption procedure, including code rollback/forward repair and before/after counts/checksums. Do not apply baseline create-table SQL to populated tables.
5. **Complete:** exact branch Node 22 CI passed all five checks for ${latestReliabilityCommit} in [GitHub Actions run ${latestReliabilityRunId}](${latestReliabilityRun}), including the server empty/populated migration fixture and both browser modes.
6. **Remaining:** restore an authorized representative copy, inspect it with read-only schema diff, rehearse baseline resolution plus rollback/forward repair and backup/restore, then obtain operator review before marking ENG-05 Complete.

Baseline-task exclusions: taxonomy, canonical course migration, managed assets, commerce and assessment revisions keep their own owners and subsequent ordered migrations. The baseline/fixture engineering prerequisite is ready for local implementation; representative restore, deployment adoption and rollback approval remain release holds. No production database changes are authorized by this document.

## M1 implementation waves

Waves respect the existing dependency graph; they are not dates or estimates. Within a wave, read each task's dependency list before starting. The ENG-09/ENG-02 review fixes are complete. ENG-05 and ENG-06 remain In Progress pending representative database and real infrastructure rehearsals; ENG-02/ENG-09 retain broader acceptance items. ${tasks.filter(t=>t.milestone==='M1'&&t.status==='Planned').length} other M1 tasks remain Planned; ENG-13 also remains In Progress. Wave 1 code regressions pass, but its operational and acceptance exit evidence is incomplete.

${waves.map(w=>`### Wave ${w.name}\n\n${w.ids.map(link).join(', ')}.\n\n${w.outcome}\n\nExit evidence: ${w.proof}`).join('\n\n')}

## Continuous verification and review

- Every implemented task adds meaningful positive/negative, cross-account, real database concurrency/recovery, migration and Arabic/English tests as applicable. Keep the 397-server/63-client and 24-per-mode browser checkpoint as historical regression evidence; record new counts for the new commit instead of treating them as a fixed test quota.
- Use [M0 manual steps](M0_MANUAL_TESTING.md) for current flows. Recheck disabled developer tabs with no requests, malformed cookies, transient refresh failures, protected course inspection, rapid PDF/course switches, failed video renewal retry, mobile profile/logout, enrollment and assignment delivery in both locales.
- Before local integration tests, verify the dedicated test target. Existing schema push is limited to local development and disposable test fixtures; install/upgrade workflows use reviewed migrations. Never use destructive fixture cleanup on a shared or real-student database.
- Preserve exact CI artifacts and coverage denominators. The [coverage inventory](../audit/m1-closure/coverage-gaps.json) and [domain ownership table](TESTING_RELEASE_GATES.md#untested-and-incompletely-tested-domain-ownership) identify what still needs tests. Do not claim every feature tested because every dashboard tab opened.
- Regenerate docs using 'node docs/scripts/build-docs.cjs', validate using 'node docs/scripts/validate-docs.cjs', and update current evidence only when new checks actually run. Keep the 58 finding IDs, 42 acceptance dispositions and immutable archived originals.

## After M1

| Milestone | Delivery focus | Required exit evidence |
|---|---|---|
| M2 / G2 | Manual editors/import preview and atomic draft commit; exact teacher revision review; ordered accessible blocks and uploaded captions; frozen assessments/deadlines/manual grading; assignment/progress; bilingual journeys | Complete real author-to-review-to-student flow and domain test/compatibility evidence, with no automatic publication or educational generation |
| M3 / G3 | Verified manual payments, EGP vouchers/renewals/refunds/reconciliation; recovery/support; guardian consent and privacy/retention; accurate metrics; production monitoring, backups and limited pilot | All launch task dispositions reviewed, full-source coverage target met, current advisory policy, production canaries and restore/rollback signed off, exact remote CI pass and pilot owner |
| M4 / G4 | Automated providers, portal, certificates, offline packs, collaboration, isolated execution and developer integrations | Each independent feature implementation, security/device/provider tests and server enablement gate; containment stays active until then |

The complete list and ownership graph remain in [ROADMAP_BACKLOG.md](ROADMAP_BACKLOG.md). Product work continues to present uploader-supplied Egyptian educational content in Arabic and English.
`);

  const foundation = tasks.filter(t=>t.milestone==='M1');
  const foundationCounts = Object.fromEntries(['Complete','In Progress','Planned'].map(status=>[status,foundation.filter(t=>t.status===status).length]));
  write('docs/M1_RELEASE_READINESS.md', `# Milestone 1 release closure

Status: **NOT RELEASE READY**. Local review and verification do not complete G1. The approved M1 scope contains **${foundation.length} tasks: ${foundationCounts.Complete} Complete, ${foundationCounts['In Progress']} In Progress, ${foundationCounts.Planned} Planned**. ENG-13 additionally continues across milestones for CI, test safety and coverage. The full scope remains in [G1](TESTING_RELEASE_GATES.md#gate-g1--durable-foundation-m1); unfinished functionality is not removed to make the release appear complete.

## Latest task review and verification

${latestReviewSummary()}

## Historical M1 review checkpoint — 23 October

The [M1 review](M1_REVIEW.md) and [machine-readable evidence](../audit/m1-review/verification.json) distinguish introduced defects, their fixes, planned work and unexecuted acceptance. Current release-review disposition: **${m1.releaseReview?.status || 'Review in progress'}**.

- Server: ${m1.server.tests} passed / ${m1.server.skipped} skipped across ${m1.server.files} files. Windows exercises clean shutdown and forced exit through test-only IPC; native Linux execution remains a CI requirement.
- Client: ${m1.client.tests} tests across ${m1.client.files} files; latest recorded lint is ${m1.client.lint.errors} errors / ${m1.client.lint.warnings} warnings.
- Current whole-source coverage (statements / branches / functions / lines): server ${currentCov('server')}; client ${currentCov('client')}. [Uncovered/partial files](../audit/m1-review/coverage-gaps.json) remain assigned to their domain tasks; G3 targets are unmet.
- Coverage run: all ${m1.server.tests} server tests passed, but the command exits 1 because functions are ${m1.server.coverage.functions.pct}% against the 90% threshold.
- Browser: production ${m1.browser.production.passed} passed and development ${m1.browser.development.passed} passed after the runtime follow-up; these modes cover desktop/Pixel emulation, not physical-device acceptance.
- Migration fixture: the fresh local run passed ${currentMigrationCount} migrations, preserving 22 synthetic rows across 21 tables after baseline adoption; empty install, drift rejection, repeated deployment and schema parity passed. Neither result establishes a representative backup/restore rehearsal.
- Remote CI: ${m1.remoteCI.status} A prior commit's result cannot validate later changes.

${m1.releaseReview?.findings?.length ? `| Review finding | Owning task | Disposition | Required regression |\n|---|---|---|---|\n${m1.releaseReview.findings.map(f=>`| ${f.id} — ${f.title} | ${link(f.owner)} | ${f.status} | ${f.regression} |`).join('\n')}` : 'The independent review is not yet finalized; no absence of findings is claimed.'}

## Remaining M1 work

Each task below retains its implementation steps, migration/compatibility requirements and acceptance tests. Planned means the full task has not been implemented or verified; prototype code and partial M0 repairs do not complete it.

| Task | Status | Required outcome | Dependencies |
|---|---|---|---|
${foundation.map(t=>`| ${link(t.id)} | ${t.status} | ${t.target.replaceAll('|','/')} | ${t.dependencies.map(link).join(', ') || 'None'} |`).join('\n')}

Follow the dependency waves in [NEXT_STEPS.md](NEXT_STEPS.md#m1-implementation-waves). Every schema change adds a reviewed migration and a populated preservation fixture; existing tables never receive baseline create SQL blindly. Shared contracts, access, assets, assessments and commerce each keep one owning task. Manual authoring, imports and educational translations remain uploader responsibilities.

## Local-only boundary and release evidence

On 23 October 2026 the user selected **local fixtures only; keep external release checks open**. Work may use disposable loopback PostgreSQL and protected local storage. No production migration, staging Supabase/scanner canary or representative restore is authorized or claimed by this record.

- [ ] Every M1 task above has completed implementation and task-specific positive/negative, ownership, concurrency, bilingual and compatibility evidence.
- [ ] All actionable review findings are resolved with regressions; the final commit passes required Linux CI, including the process-level shutdown case.
- [ ] Representative database and private-object backup/restore, migration-history adoption and rollback/forward repair are reviewed by the operator.
- [ ] Real private Supabase and ClamAV clean/infected/unavailable/timeout checks, maximum-size resource measurements and supported physical-device playback pass.
- [ ] G1 contracts/taxonomy/access/session/outbox/managed-asset criteria are accepted. A passing config/media smoke suite does not establish these missing features.

Only after these checks pass should an executed, dated release record be created under docs/releases with the exact application revision, migration chain, commands/job links, outcomes and owner sign-offs. G1 is a foundation milestone; real-student/paid onboarding also requires G2/G3.

## Completed-task cleanup

Completed task specifications are moved out of docs/tasks into docs/archive/completed under their original milestone, with links rewritten and IDs retained. The current archive contains ${tasks.filter(t=>t.status==='Complete').length} records. Unfinished tasks remain in the active backlog; historical audit reports and preservation checksums are retained. See [the archive index](archive/completed/README.md) and [all task dispositions](ROADMAP_BACKLOG.md).
`);
}

module.exports = {date,implementationCommit,evidence,m1,waves,taskUpdate,writeStatusAndNext};
