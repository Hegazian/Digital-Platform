const cases = [];
const ac = (id,disposition,tasks,criterion,gate) => cases.push({id,disposition,tasks:tasks.split(' '),criterion,gate});
ac('A01','Retained','ENG-01 ENG-05 ENG-13 ENH-02','Clean lockfile install, Prisma generation, supported runtime typechecks and both production builds pass.','G0');
ac('A02','Revised','SEC-02 ENH-03 ENH-13','Raw local/cloud private paths deny access; authorized short-lived grants/proxy work for lessons, own submissions and receipts. Offline packs remain M4 and rights-gated.','G0/G1');
ac('A03','Retained','SEC-03 ENH-03','Disguised HTML/JS, invalid signatures and unsafe polyglots are rejected/quarantined and cannot execute on the application origin.','G0/G1');
ac('A04','Revised','SEC-04 SEC-06 ENG-04 ENG-10','All public catalog/section/collection responses use allowlisted metadata; no paid body, object key, block secret or private visibility leakage.','G0/G1');
ac('A05','Retained','SEC-05 SEC-07 SEC-08 LRN-03','Every question type is checked recursively for key/snapshot leaks on public/student/unrelated-teacher and terminal attempt paths; owner/reviewer access is explicit.','G0/G2');
ac('A06','Retained','SEC-01','Production reference seed cannot create/reset known privileged credentials; one-time provisioning and deployed-credential remediation are evidenced.','G0');
ac('A07','Retained','SEC-09 LRN-13 LRN-14','Authenticated actor cannot be overridden on announcement/live mutations; owner and acting editor are recorded separately.','G0/G2');
ac('A08','Retained','SEC-10 ENG-14','Every security-sensitive account mutation revokes stale authorization on the next request across API instances.','G0/G1');
ac('A09','Revised','SEC-11','PENDING/REJECTED teachers cannot obtain normal sessions through login, refresh or MFA; an appeal/status path does not grant platform privileges.','G0');
ac('A10','Revised','SEC-13 SEC-14 ENG-14','Refresh has one successor, bounded 409 tab-race handling and family-scoped replay revocation; concurrent TOTP/recovery code accepts once.','G1');
ac('A11','Retained','COM-01 COM-10 SEC-12 ENH-10','Every grant source produces equivalent learning/media/assessment/assignment/discussion/download decisions and deduplicated effective audience.','G1/G2');
ac('A12','Revised','COM-02 COM-09 SEC-06','Future/expired/revoked grants obey exact interval boundaries; renewal ignores stale ACTIVE labels; archive retains prior access and retraction blocks delivery.','G1');
ac('A13','Revised','COM-03 COM-07','Clamped calendar terms and explicit durations obey documented Cairo gap/overlap rules; original purchased history is not silently recalculated.','G1');
ac('A14','Revised — staged','COM-04 ENG-03','Launch provider APIs fail FEATURE_DISABLED. M4 each provider independently passes official sandbox checkout/callback/refund/reconciliation fixtures before enablement.','G3 disabled; G4 enablement');
ac('A15','Revised','COM-06 COM-04 COM-11','Manual decisions and later verified callbacks dedupe payment/grant effects, retain ledger history and reject stale payment after cancellation/refund.','G1/G3; provider G4');
ac('A16','Retained','COM-05 COM-12','Actor/operation/key and payload hash prevent disclosure, changed-intent reuse and duplicate concurrent checkout creation.','G1/G3');
ac('A17','Retained','COM-08','Same-student voucher race consumes one use/grant; global caps and rollback remain correct under real database concurrency.','G3');
ac('A18','Revised','COM-07 COM-06 COM-12 ENG-02','Valid EGP resource/duration snapshots produce usable access; paid-but-unfulfilled states are durable, visible and recoverable.','G1/G3');
ac('A19','Retained','LRN-05 ENH-06','Teacher changes create drafts; only exact reviewed immutable revisions publish; admin-owned publication still runs completeness.','G2');
ac('A20','Revised','LRN-06 ENH-06 LRN-08 ENH-14 ENH-15','Every launch-supported uploaded/edited block renders in order; board/code blocks show honest server-disabled state until their separate M4 gates pass.','G2; advanced G4');
ac('A21','Retained','LRN-07','Canonical module migration loses no lesson ID, order, preview or progress; database forbids orphan/conflicting cross-course parents.','G1');
ac('A22','Revised','LRN-09 SEC-02','Explicit published previews are read-only per lesson for permitted audiences; siblings, files and write operations stay protected.','G2');
ac('A23','Retained','LRN-01 LRN-04','Expiry persists after the HTTP error, counts once, repeats stably and permits a next attempt only within rules.','G2');
ac('A24','Retained','LRN-10 LRN-11','Reload uses same server deadline/saved answers; stale response or identity/quiz switch cannot leak state; expired first render is safe.','G2');
ac('A25','Retained','LRN-02 LRN-04','Immutable versions freeze question identities/rules; due dates and max attempts hold under concurrent submissions.','G2');
ac('A26','Revised','LRN-03 ENH-09 ENH-12','Objective types use explicit policies, essays await human rubric review, pending work is excluded from final averages/mastery/certification.','G2; enhancements G4');
ac('A27','Retained','LRN-04 SEC-12','Assignment attempt/deadline/file/grader ownership and score bounds persist through concurrent HTTP/upload/browser flows.','G2');
ac('A28','Retained','LRN-12 ENH-09','Bounded idempotent watch progress and resume survive refresh/device change; failed sync is visible and never equated with mastery.','G2');
ac('A29','Revised','ENG-09 ENH-03','Uploaded supported source media is verified/processed privately, plays/seeks on target browsers and handles ranges/disconnects without crashes.','G1/G2');
ac('A30','Retained','LRN-13 COM-10 ENH-10','Owned-course announcements reach one effective deduplicated audience through durable delivery and bounded retry.','G2');
ac('A31','Revised','LRN-14','Valid existing teacher-provided meeting URLs are stored and presented across all eligible subjects; no invented meetings or student host-link leaks.','G2');
ac('A32','Revised','LRN-16 ENH-01 ENH-06','Entire Arabic/English interface journey works after reload; courses declare supplied AR/EN/BILINGUAL content without requiring generated translations.','G2/G3');
ac('A33','Retained','SEC-13 ENG-14 ENG-11','Real reverse-proxy cookies/login/refresh/profile/logout/recovery work across tabs with terminal versus retryable failures distinguished.','G1/G3');
ac('A34','Revised — human upload','ENH-01 ENH-03 ENH-05','Uploaded sources retain checksum, edition/year/term/outcome/page metadata and uploader permission declaration; no extraction/generation or automatic publication is required.','G2');
ac('A35','Revised — manual editing/import','ENH-04 ENH-06 LRN-05','Uploader-created Arabic/English text, keys and rubrics validate, preview and atomically import/edit as drafts; exact admin approval precedes teacher publication.','G2');
ac('A36','Superseded — AI withdrawn','SCOPE-01 SCOPE-02 ENG-15 ENH-08','Tutor UI/routes/SDK/config/fallback are removed; legacy endpoint returns 410/404 and no provider request occurs. Entitled content search is a separate staged feature, not tutoring.','G0; search G4');
ac('A37','Revised — uploaded media','ENH-03 ENH-07 ENH-05','Uploaded source video/audio and uploader-provided captions/transcripts retain integrity and exact revision pairing; technical transcodes/thumbnails do not generate teaching material.','G2');
ac('A38','Revised','ENG-06 ENG-07 ENG-08 ENG-10 ENH-10 ENH-16 ENH-17','DB/storage/queue/email/payment outages return correct pending/unavailable states, fail readiness appropriately and retain audit/delivery jobs; model/provider dependency is withdrawn.','G1/G3');
ac('A39','Retained','ENG-05 ENH-16','Upgrade plus backup/restore preserves purchases, permissions, student work, immutable revisions and provenance; deletion ledger is respected after restore.','G1/G3');
ac('A40','Revised','ENG-13 SEC-15 ENG-12','Dependency exposure is triaged/remediated for the release deployment; critical browser/concurrency/migration jobs have no skips; unsafe execution and incomplete integrations remain API-disabled.','G0/G3');
ac('A41','Revised','LRN-15 ENH-01 ENH-08','Configured stages/grades/terms and Arabic/English search/paging find known courses past 100; /careers is used only where relevant; entitled full-content search remains staged.','G2; search G4');
ac('A42','Retained','ENH-07 LRN-16 ENH-11 ENH-13 ENH-14','Keyboard/screen-reader/contrast/captions/mobile/touch/slow-network flows pass; advanced features need equivalent evidence before M4 enablement.','G2/G3; advanced G4');

function writeShared(ctx) {
 const {write,tasks,findings,originalCases,milestoneNames,read} = ctx;
 const {writeStatusAndNext,implementationCommit} = require('./current-state.cjs');
 writeStatusAndNext(ctx);
 const taskLink = id => `[${id}](tasks/${id}.md)`;
 const byId = new Map(tasks.map(t=>[t.id,t]));
 const visited = new Set(), visiting = new Set(), ordered = [];
 function visit(t) { if (visiting.has(t.id)) throw Error('dependency cycle at '+t.id); if(visited.has(t.id))return; visiting.add(t.id); for(const d of t.dependencies) {if(!byId.has(d))throw Error('missing dependency '+d);visit(byId.get(d));} visiting.delete(t.id);visited.add(t.id);ordered.push(t); }
 for(const m of Object.keys(milestoneNames)) for(const t of tasks.filter(t=>t.milestone===m))visit(t);
 write('docs/README.md', `# Implementation documentation — start here

Refreshed: **23 October 2026**. [Current status](CURRENT_STATUS.md) records test evidence and release holds. The active backlog contains ${tasks.filter(t=>t.status!=='Complete').length} unfinished tasks; ${tasks.filter(t=>t.status==='Complete').length} completed specifications are [archived](archive/completed/README.md). The [M1 release closure](M1_RELEASE_READINESS.md) lists every unfinished foundation task, review finding and external evidence requirement. Read [the M1 review](M1_REVIEW.md), [manual checks](M1_MANUAL_TESTING.md) and [implementation order](NEXT_STEPS.md) together. G1–G3 remain open; current work uses local fixtures only. [The final M0 review](M0_FINAL_REVIEW.md) remains historical checkpoint evidence.

> A bilingual educational platform for Egyptian students across all school stages. Admins and approved teachers provide educational content through uploads, imports, and manual editors. The platform organizes, reviews, publishes, protects, and presents that content, manages assessments and student progress, and controls enrollment and paid access.

## Ordered start checklist

1. Read [product scope](PRODUCT_SCOPE.md) and confirm the uploader/editor responsibility and required teacher review.
2. Read [current verification](CURRENT_STATUS.md) and [baseline evidence and limits](TESTING_RELEASE_GATES.md#baseline-evidence); G0 is complete for internal work, while external onboarding remains gated by G1–G3 and operator evidence.
3. Keep [M1-R01–R04](M1_REVIEW.md) regressions passing under ENG-09/ENG-02: upload lifetime, atomic config responses, pricing draft retention and compatible READY browser fixtures. Complete the remaining task evidence, follow [manual checks](M1_MANUAL_TESTING.md), keep ENG-05/06 rehearsals open and use the [M1 dependency waves](NEXT_STEPS.md#m1-implementation-waves). ENG-13 retains full-product verification ownership.
4. Before real traffic, complete G1–G3 and the storage/scanner/credential/restore holds in [operations](MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold).
5. Implement migrations/contracts/taxonomy/access/assets under their owning tasks; read [target architecture](TARGET_ARCHITECTURE.md) and [contracts](API_DATA_CONTRACTS.md) before adding endpoints.
6. Deliver manual authoring/import -> exact admin review -> private lesson -> assessment/assignment -> progress in Arabic and English, then verified manual payment/voucher journeys.
7. Rehearse [operations, migration and recovery](MIGRATION_OPERATIONS.md), resolve minor-consent/retention and license decisions, and collect [release gate evidence](TESTING_RELEASE_GATES.md) for a limited pilot.
8. Keep every M4 capability disabled at API boundaries; enable each only after its own gate. Automated payment adapters have independent provider sign-offs.

## Package index

| Document | Purpose |
|---|---|
| [Current implementation status](CURRENT_STATUS.md) | Latest verified commit, exact tests/coverage, completed work and remaining holds |
| [M1 release closure](M1_RELEASE_READINESS.md) | Complete M1 task disposition, current review findings and remaining release evidence |
| [Next implementation steps](NEXT_STEPS.md) | Verified baseline prerequisite, next local M1 implementations, dependency waves and external release evidence |
| [M1 review](M1_REVIEW.md) | Four resolved code findings, owners, regressions and remaining acceptance limits |
| [M1 manual verification](M1_MANUAL_TESTING.md) | Step-by-step config, pricing, upload, playback and operations checks |
| [ENG-02 implementation evidence](ENG02_IMPLEMENTATION.md) | Config versioning, EGP semantics, resolved concurrency/draft regressions and remaining acceptance |
| [ENG-05 implementation evidence](ENG05_IMPLEMENTATION.md) | Baseline rationale, local and remote migration checks, and outstanding adoption gates |
| [ENG-06 implementation evidence](ENG06_IMPLEMENTATION.md) | Liveness/readiness, storage selection, graceful drain, local tests and remaining outage checks |
| [ENG-09 implementation evidence](ENG09_IMPLEMENTATION.md) | Bounded video upload staging/streaming, accurate processing state, range tests and remaining M1 acceptance |
| [Product goal and scope](PRODUCT_SCOPE.md) | Audiences, permissions, all-school curriculum, launch scope and exclusions |
| [Target architecture](TARGET_ARCHITECTURE.md) | Module/data ownership, workers, deployment and safety boundaries |
| [API and data contracts](API_DATA_CONTRACTS.md) | Normative DTOs, schemas, actions, errors, validation and compatibility |
| [Roadmap and backlog](ROADMAP_BACKLOG.md) | Unfinished task links, dependencies, milestones and execution order |
| [Completed task specifications](archive/completed/README.md) | Completed records archived under their own milestone and excluded from the active backlog |
| [Final M0 review](M0_FINAL_REVIEW.md) | Findings, corrections, fresh verification and merge disposition |
| [Audit traceability](AUDIT_TRACEABILITY.md) | All 58 findings and all 42 previous acceptance dispositions |
| [Testing and release gates](TESTING_RELEASE_GATES.md) | Baseline, fixtures, CI, exit criteria and sign-off evidence |
| [M0 manual testing](M0_MANUAL_TESTING.md) | Local setup, step-by-step checks and visible browser replay |
| [Earlier reviews](archive/reviews/README.md) | Historical checkpoint results and resolved findings, removed from the active plan |
| [M0 dependency review](M0_DEPENDENCY_REVIEW.md) | Patched runtime paths and bounded development-only exceptions |
| [Migration and operations](MIGRATION_OPERATIONS.md) | Data/asset preservation, deployment, rollback, recovery and monitoring |
| [Task template](TASK_TEMPLATE.md) | Required task detail and completion checklist |
| [Documentation verification](VERIFICATION_REPORT.md) | Task/finding/case coverage, links, dependencies and archived hash checks |
| [Archived documents](archive/INDEX.md) | Exact previous guides/FR/TC identifiers, superseded status and hashes |

Task source is maintained in [documentation authoring scripts](scripts/build-docs.cjs); [task-manifest.json](task-manifest.json) is machine-readable output. Run 'node docs/scripts/build-docs.cjs' to rebuild generated task/index/entry docs, then 'node docs/scripts/validate-docs.cjs'. Shared hand-written specifications are not overwritten by the generator. The generator and validator do not connect to the application or database; the separate advisory script contacts the NPM advisory service.
`);
 write('docs/ROADMAP_BACKLOG.md', `# Roadmap and implementation backlog

Tasks begin **Planned**. Priorities P0=immediate blocker, P1=required correctness/security, P2=important completeness/quality. Milestones are dependency gates, not calendar estimates. Status changes require exact implementation/test evidence; the documentation delivery does not complete engineering tasks.

Updated **23 October 2026**: **${tasks.filter(t=>t.status==='Complete').length} archived Complete / ${tasks.filter(t=>t.status==='In Progress').length} In Progress / ${tasks.filter(t=>t.status==='Planned').length} Planned**. See [current evidence](CURRENT_STATUS.md), [the historical M0 review](M0_FINAL_REVIEW.md), [the M1 review](M1_REVIEW.md), and [the next-steps handoff](NEXT_STEPS.md). Completed task specifications are [archived](archive/completed/README.md) and excluded from this execution queue.

## Milestones and release assignment

| Milestone | Exit / scope | Gate |
|---|---|---|
| M0 — Scope and immediate safety | AI exposure removed, build/test safety, known credentials/files/keys/actor/role leaks repaired, dependency triage/remediation | G0 safe internal build |
| M1 — Foundation and content delivery | Migrations, typed contracts, academic registry, canonical hierarchy, private assets, shared access and session correctness | G1 durable foundation |
| M2 — Authoring and learning | Human editors/imports, reviewed revisions, player, versioned assessments, assignments, progress, accessible bilingual UX | G2 complete learning |
| M3 — Paid release and operations | Manual payment/vouchers, recovery/support/consent/retention, actual metrics, monitoring/backup/production CI and limited pilot | G3 controlled paid pilot |
| M4 — Post-launch | Provider adapters, guardian portal, certificates, offline, collaboration, isolated execution and developer integrations | G4 individual enablement |

M0 ENG-13 establishes the harness and resolves/triages dependency exposure. Later tasks add their regression evidence; G3 reruns complete CI. COM-04 is assigned M3 for launch containment, with **Paymob and Fawry enablement in M4**. ENH-11 is assigned M3 for minimal consent, with **guardian portal in M4**. ENG-03 disables incomplete integrations from M0. A task with a staged subdeliverable is not globally Completed merely because containment passed; track each subgate in its evidence checklist.

M0's engineering/G0 checkpoint is finalized for internal synthetic data. ENG-13 remains In Progress for its later full-product coverage obligation; its M0 harness/dependency subgate passed. Production holds are explicit in [M0 status](M0_IMPLEMENTATION_STATUS.md).

## Active backlog (${tasks.filter(t=>t.status!=='Complete').length} tasks)

| ID / title | Priority | Milestone | Status | Dependencies |
|---|---|---|---|---|
${tasks.filter(t=>t.status!=='Complete').map(t=>`| ${taskLink(t.id)} — ${t.title} | ${t.priority} | ${t.milestone} | ${t.status} | ${t.dependencies.length?t.dependencies.map(taskLink).join(', '):'None'} |`).join('\n')}

## Remaining execution queue

**Keep M1-R01–R04 regressions green under ENG-09/ENG-02**, complete ENG-05/06 operational evidence and continue ENG-13, then use the [five M1 waves](NEXT_STEPS.md#m1-implementation-waves). The dependency graph below is the complete reference; this queue excludes Complete tasks:

${Object.keys(milestoneNames).map(m=>`- **${m}:** ${ordered.filter(t=>t.milestone===m && t.status!=='Complete').map(t=>taskLink(t.id)+(t.status==='In Progress'?' (continuing)':'')).join(', ') || 'Internal engineering complete; retain regression evidence and external traffic holds.'}`).join('\n')}

## Ordered implementation sequence

This is one valid dependency-respecting sequence. Tasks with satisfied dependencies may proceed independently; phase gates still apply. Shared owners in [architecture](TARGET_ARCHITECTURE.md#implementation-ownership) prevent parallel duplicate engines.

${Object.keys(milestoneNames).map(m=>`### ${m} — ${milestoneNames[m]}\n\n${ordered.filter(t=>t.milestone===m && t.status!=='Complete').map((t,i)=>`${i+1}. ${taskLink(t.id)} — ${t.title}`).join('\n') || 'Completed specifications are archived; retain regression checks and production holds.'}`).join('\n\n')}

## Decisions and evidence required before real onboarding

- Operator verifies manual destination details, reconciliation/refund ownership and product durations; no hardcoded bank details or automatic payment simulation.
- Product owner and qualified local reviewers approve minor/guardian consent, privacy/retention periods and content-rights policy. Unknown historic consent/rights is not inferred.
- Owner resolves software license before public source distribution; the unsupported MIT claim is withdrawn and current source metadata is private/UNLICENSED.
- Operations supplies production private storage, verified email, isolated database/queue, monitored backups and named incident/support owners.
- Exact application/content revisions, migration IDs, test evidence and disabled-feature matrix are recorded in [release gates](TESTING_RELEASE_GATES.md).
`);
 write('docs/AUDIT_TRACEABILITY.md', `# Audit and acceptance traceability

Audit baseline **2fbdc8e**, 21 October 2026. Current task disposition refreshed **23 October**; historical M0 application checkpoint **${implementationCommit}**; see [current status](CURRENT_STATUS.md) and [next steps](NEXT_STEPS.md). The [original review](../audit/PRODUCT_READINESS_REVIEW.md) and [test gap matrix](../audit/TEST_GAP_MATRIX.md) remain historical evidence. Their AI-production recommendations and AI-dependent release gates are **withdrawn**, not open defects under the revised mission. No production exploit or unrun integration success is inferred.

## M1 review supplement

[M1-R01–R04](M1_REVIEW.md) are resolved by upload lifetime, exact config readback, pricing draft and READY-fixture regressions owned by ENG-09/ENG-02. The second independent review found M1-R05 in the shutdown process test, now fixed and rechecked under ENG-06/ENG-13. [Release closure](M1_RELEASE_READINESS.md) retains the full unfinished M1 task matrix and local-only/external evidence boundary. The original 58 finding IDs and 42 acceptance dispositions remain unchanged. Fresh M1 coverage and test evidence is separate from historical M0 CI.

## Finding disposition — 58 of 58

Every finding keeps its original ID in exactly one file, has a release milestone/dependencies, and has task-specific test IDs. R/S/C/G evidence labels retain their original meaning. A conditional finding remains conditional until real-environment verification.

| Finding | Owning task / title | Milestone | Status | Acceptance / disposition |
|---|---|---|---|---|
${tasks.filter(t=>findings.has(t.id)).map(t=>`| ${t.id} | ${taskLink(t.id)} — ${t.title} | ${t.milestone} | ${t.status} | ${cases.filter(c=>c.tasks.includes(t.id)).map(c=>`[${c.id}](#${c.id.toLowerCase()})`).join(', ')}; ${t.id==='COM-04'?'launch disabled; providers M4':t.id==='SEC-15'||t.id==='LRN-08'?'launch containment; separate M4 owner':t.id==='ENG-12'?'API disabled by ENG-03; implementation M4':t.id==='ENG-11'?'recovery launch; guardian portal ENH-11 M4':t.id==='ENG-15'?'claims corrected; license owner decision recorded':'required before assigned milestone exit'}. Tests ${t.id}-T01 onward and T90–T92. |`).join('\n')}

## Original acceptance cases — 42 of 42

The legacy wording below is quoted solely to preserve lineage. Only **current criterion** is normative. “Revised” retains the intent with updated uploader/access/launch rules; “Superseded” withdraws the former AI requirement and provides removal checks. Each task has additional detailed test scenarios; ENH task tests cover new capabilities beyond these 42 inherited cases.

${cases.map(c=>`### ${c.id}\n\n- Disposition: **${c.disposition}**. Gate: **${c.gate}**.\n- Historical criterion (superseded wording where changed): ${originalCases.get(c.id)}\n- **Current criterion:** ${c.criterion}\n- Implementation/test owners: ${c.tasks.map(taskLink).join(', ')}. Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.\n`).join('\n')}

## Withdrawn recommendations and replacement ownership

| Historical recommendation | Current disposition / owner |
|---|---|
| AI source ingestion/OCR/chunk retrieval pipeline | Not required; human uploads with metadata/rights and file verification, ENH-03/ENH-05 |
| AI-generated bilingual lessons/questions/assignments | Withdrawn; manual editors and versioned JSON/CSV imports, ENH-04/ENH-06 |
| Tutor/grounded conversational answers/provider adapters | Removed under SCOPE-02; no replacement tutoring feature |
| AI narration/video/caption generation | Withdrawn; upload supplied media/captions/transcripts, technical processing only, ENH-03/ENH-07 |
| Model/prompt/evaluation/cost pipeline and model outage release gate | No active runtime requirement; ordinary editorial accuracy, grading, processing and operational tests remain |
| AI production dashboard | Withdrawn; real editorial/learning/ledger analytics, ENH-17 |
| Narrow Scientific Math schema or audience-only product claim | Replaced by configurable all-school taxonomy, ENH-01; pilot content may still be intentionally limited |

Dependency advisory remediation is owned by ENG-13 even though the original report discussed advisories outside the 58 numbered findings. Safe test database enforcement and missing component coverage are also explicit ENG-13 work. Support/privacy/rights decisions are ENH-16/ENH-05; no unnumbered review concern is silently treated as fixed.
`);
 write('docs/archive/INDEX.md', `# Superseded documentation archive

The original design guides listed below are **historical and superseded** by [current documentation](../README.md). Their original bytes and FR/TC/checklist IDs remain available for audit. Their AI generation/tutoring, model pipelines, old microservice plans, license badges and fixed schedule assumptions are withdrawn.

[Completed task specifications](completed/README.md) and [earlier reviews](reviews/README.md) are retained separately as historical implementation/acceptance evidence. They are excluded from the active work queue; current decisions and results live in [the final review](../M0_FINAL_REVIEW.md).

The [archive manifest](manifest.json) records original path and SHA-256. The generator never overwrites an existing archive. New active entries point to the current product/architecture/test/usage documents; historic design comparisons remain available only as context.

${JSON.parse(read('docs/archive/manifest.json')).map(x=>`- [${x.path}](${x.path}) — superseded; exact pre-update copy.`).join('\n')}
`);
const entry = (title, body, archive) => { const prefix = archive.includes('/server/') || archive.includes('/client/') ? '../docs/' : 'docs/'; return `# ${title}\n\n**Updated: 23 October 2026**, historical M0 application checkpoint **${implementationCommit}**. M0 engineering is finalized for internal synthetic data. M1/G1 is not release ready: [release closure](${prefix}M1_RELEASE_READINESS.md) lists all unfinished M1 tasks, current review findings and external acceptance holds. [Current results](${prefix}CURRENT_STATUS.md), [the M1 review](${prefix}M1_REVIEW.md) and [implementation order](${prefix}NEXT_STEPS.md) identify the verified work and remaining requirements. Current execution uses local fixtures only; G1–G3 and production onboarding remain gated. Previous content is [superseded and preserved](${archive}).\n\n${body}\n`; };
 write('README.md', entry('Educational platform for Egyptian students', `A bilingual educational platform for Egyptian students across all school stages. Admins and approved teachers provide content through uploads, structured imports and manual editors. The platform reviews, publishes, protects and presents that content, manages assessments and progress, and controls enrollment and paid access.

Educational content creation belongs to uploaders. AI tutoring, generation and provider integrations are outside the revised product scope; the tutor interface, route, provider dependency and key configuration have been removed. Technical validation/scanning/transcoding/thumbnail processing of supplied files is permitted. Arabic/English interface support is required; uploader-supplied courses may be Arabic, English or bilingual.

Start with [the implementation documentation](docs/README.md), [all 77 tasks](docs/ROADMAP_BACKLOG.md), [scope](docs/PRODUCT_SCOPE.md), [target architecture](docs/TARGET_ARCHITECTURE.md), [contracts](docs/API_DATA_CONTRACTS.md), [audit mapping](docs/AUDIT_TRACEABILITY.md), [release gates](docs/TESTING_RELEASE_GATES.md) and [operations](docs/MIGRATION_OPERATIONS.md).

The repository uses Next.js/React in client and Express/Prisma/PostgreSQL in server with existing JWT authentication. M0 implements protected local files and a private-Supabase production startup guard. Managed media and separate processing/delivery workers remain planned M1 work. Supabase Auth is not introduced.

Launch targets free enrollment, verified manual payments and vouchers in EGP. Teacher content/revisions require admin approval; admins may publish their own content. Automated gateways, guardian portal, certificates, offline packs, collaboration, isolated execution and developer integrations stay server-disabled until their individual gates pass.

For setup and verification see the [M0 manual guide](docs/M0_MANUAL_TESTING.md), [usage](project_overview_and_usage_guide.md), [server guide](server/README.md) and [client guide](client/README.md). The [final review](docs/M0_FINAL_REVIEW.md) records the reviewed integration, fixes and current evidence. [M0 implementation status](docs/M0_IMPLEMENTATION_STATUS.md) preserves the earlier checkpoint; current production holds are in [operations](docs/MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold). The original review's 108-test sample, build blocker and unvalidated integration are historical baselines.

No whole-repository license is asserted by this README: the former MIT badge was unsupported and current source metadata is private/UNLICENSED. Owner approval and an explicit license file are required before public source distribution.`, 'docs/archive/README.md'));
 write('task.md',entry('Task index',`The authoritative backlog is [ROADMAP_BACKLOG.md](docs/ROADMAP_BACKLOG.md): **58 finding tasks + 2 scope tasks + 17 enhancement tasks = 77**, with current implementation status. Follow the dependency order and [start checklist](docs/README.md). Each [task file](docs/ROADMAP_BACKLOG.md#indexed-backlog-77-tasks) contains implementation locations, contracts, migration/rollback, security/failure behavior and acceptance tests.\n\nDo not check off legacy items as evidence of the revised release gates. Application changes, migrations and deployments are separate work defined by these tasks.`, 'docs/archive/task.md'));
 write('implementation_plan.md',entry('Implementation plan',`The former parity/microservice/AI schedule is **superseded**. The current plan is [five milestones and ordered dependencies](docs/ROADMAP_BACKLOG.md). **M0 is complete for internal engineering; M1 is active and requires changes.** The [detailed handoff](docs/NEXT_STEPS.md) contains all 25 M1 tasks, their dependencies, the first implementation scope and exit evidence.

1. **Complete ENG-05 validation:** reviewed Prisma migration history, empty/populated upgrade preservation, disposable prior-schema fixtures and restore/rollback verification.
2. **M1 foundation:** shared contracts and Egyptian academic metadata; canonical modules; common access and effective dates; managed private assets; audit/outbox; atomic sessions/MFA and recoverable commerce primitives. Use the five dependency waves in the handoff.
3. **ENG-13 throughout:** retain M0 regressions, add domain/component/concurrency/migration evidence, obtain remote Node 22 CI results and meet the existing G3 coverage target. Resolve development advisory exceptions before paid release or 19 January 2027.
4. **M2 authoring/learning:** manual editing and import preview, exact-revision teacher approval, accessible ordered content, versioned assessments, assignments, progress and complete Arabic/English journeys.
5. **M3 paid pilot/operations:** verified manual payments and vouchers in EGP, recovery/reconciliation, consent/privacy/support, real analytics, monitoring, backups and controlled student onboarding after G1–G3.
6. **M4 independent enablement:** automated gateways, guardian portal, certificates, offline, collaboration, isolated execution and developer integrations remain server-disabled until their own implementations and gates pass.

Use [current results and remaining holds](docs/CURRENT_STATUS.md), [target architecture](docs/TARGET_ARCHITECTURE.md), [contracts](docs/API_DATA_CONTRACTS.md), [migration/rollback](docs/MIGRATION_OPERATIONS.md) and [release gates](docs/TESTING_RELEASE_GATES.md). Retain the modular monolith and existing auth. Uploaders supply educational content and translations; AI generation and a Supabase Auth migration are outside scope. Completion requires evidence, not the old dated estimates or this documentation refresh.`, 'docs/archive/implementation_plan.md'));
 write('Educational_Platform_Requirements_and_Test_Plan.md',entry('Requirements and acceptance plan',`Normative requirements are [PRODUCT_SCOPE.md](docs/PRODUCT_SCOPE.md) and [API_DATA_CONTRACTS.md](docs/API_DATA_CONTRACTS.md). The [42-case disposition](docs/AUDIT_TRACEABILITY.md#original-acceptance-cases--42-of-42) explicitly maps retained/revised/superseded audit acceptance. [Testing gates](docs/TESTING_RELEASE_GATES.md) specify fixtures, CI and release evidence.\n\nThe original FR/TC text and identifiers are preserved in the archive for lineage; they are not automatically active requirements. New feature acceptance is in its stable task file. Human-provided source content, explicit review and fully bilingual interface replace all AI-dependent educational requirements.`, 'docs/archive/Educational_Platform_Requirements_and_Test_Plan.md'));
 write('Educational_Platform_System_Design_Document.md',entry('System design',`Use the [target architecture](docs/TARGET_ARCHITECTURE.md), [shared API/data contracts](docs/API_DATA_CONTRACTS.md) and [operations design](docs/MIGRATION_OPERATIONS.md). Course -> Module/Unit -> Lesson -> ordered typed blocks is canonical. Immutable published revisions and versioned attempts preserve learning history.\n\nThe prior design is superseded. Background workers process uploaded files and durable delivery jobs; they do not generate educational material. Private asset IDs, shared access policy, EGP ledger and server capability enforcement are required boundaries.`, 'docs/archive/Educational_Platform_System_Design_Document.md'));
 write('project_overview_and_usage_guide.md',entry('Project overview and development usage',`Read [scope](docs/PRODUCT_SCOPE.md) and [implementation status](docs/ROADMAP_BACKLOG.md) first. Students consume published content and manage their own work; approved teachers author owned/assigned drafts; admins approve teacher revisions and may publish their own valid content.

## Existing local commands (prototype)

CI uses Node 22; local M0 verification used Node 26.7.0. Install each package using its lockfile ('npm ci' in server and client). Compose defines PostgreSQL dev at 5434 and test at 5433; durable workers and a queue are future infrastructure under ENG-07. Compose is not an application production deployment. The [M0 manual guide](docs/M0_MANUAL_TESTING.md) gives complete isolated setup and commands.

Configure server environment from its example, including DATABASE_URL and DIRECT_URL, using separate dedicated databases. Tests/reset helpers allow only the explicit local eduplatform_test database. Never print secrets or run destructive tests against shared data. Local application tests may use db:push:test against the disposable test database; empty installs and deployed upgrade paths use the checked-in migration chain. The ENG-05 fixture builds the exact pre-M0 schema with db push inside a unique, disposable test schema, never against existing tables. Existing deployments require a read-only schema comparison, backup and reviewed baseline resolution before the additive auth-version bridge is deployed; see [operations](docs/MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold). Reference seeding no longer creates login accounts; initial admin provisioning requires explicit one-time opt-in and unique credentials.

In server, existing commands are 'npm run dev', 'npm run typecheck', 'npm run build', 'npm test'; in client, 'npm run dev', 'npm run typecheck', 'npm run build' and 'npm run lint'. Next 16 uses the separate ESLint CLI. Coverage and isolated browser commands are documented in docs/M0_MANUAL_TESTING.md. Backend normally runs on 5000 and frontend on 3000; verify configured proxy/API URL. Existing tests may delete whole tables: apply the [test database safety gate](docs/TESTING_RELEASE_GATES.md#test-protocol) before running them.

## Planned operational usage

Admin configures academic registry/payment instructions and approves teachers. Teacher creates course/unit/lesson, supplies locale text, uploads media/captions/rights evidence or previews structured imports, then submits exact revision. Admin reviews/requests changes/approves; student gets private entitled or explicit-preview delivery. Manual payment stays pending until administrator verifies settlement; voucher redemption is atomic. Detailed API and error contracts are [here](docs/API_DATA_CONTRACTS.md).

Production, migration, backup, support and rollback procedures are specified in [MIGRATION_OPERATIONS.md](docs/MIGRATION_OPERATIONS.md); they are planned work, not commands to execute against this prototype.`, 'docs/archive/project_overview_and_usage_guide.md'));
 write('manual_testing_guide.md',entry('Manual verification guide',`Start with the [step-by-step M0 manual guide](docs/M0_MANUAL_TESTING.md) and [review resolutions](docs/M0_REVIEW_RESOLUTION.md). Follow [testing and release gates](docs/TESTING_RELEASE_GATES.md), [42-case mapping](docs/AUDIT_TRACEABILITY.md) and each owning task’s named tests. Use dedicated deterministic student A/B, approved teacher A/B, pending/rejected teacher and admin fixtures.\n\nRequired browser journeys include human author/import/review/publish, private preview/paid delivery, objective/manual grading, assignment upload, progress recovery, manual checkout/voucher and full Arabic/English flows. Test direct APIs as well as hidden UI. Do not run legacy destructive cleanup against a non-test database or count skipped/permissive browser assertions as passing.`, 'docs/archive/manual_testing_guide.md'));
 write('REQUIREMENTS_COVERAGE.md',entry('Requirements coverage and evidence status',`Current coverage is [AUDIT_TRACEABILITY.md](docs/AUDIT_TRACEABILITY.md): all 58 findings, 42 acceptance dispositions and 77 tasks with current implementation status. Evidence limits are in [TESTING_RELEASE_GATES.md](docs/TESTING_RELEASE_GATES.md#baseline-evidence).\n\nThe old requirements checklist is superseded and does not prove runtime completion. [Current whole-source unit/component coverage](docs/CURRENT_STATUS.md) is measured with actual denominators; it is not feature completeness or production readiness. Update task status only after implementation and exact test/release evidence.`, 'docs/archive/REQUIREMENTS_COVERAGE.md'));
 write('teacher.md',entry('Teacher authoring requirements',`The approved workflow is [product scope](docs/PRODUCT_SCOPE.md), [ENH-06 authoring](docs/tasks/ENH-06.md), [ENH-04 imports](docs/tasks/ENH-04.md), [LRN-05 revisions](docs/tasks/LRN-05.md) and [ENH-05 provenance](docs/tasks/ENH-05.md). Teachers manage owned/assigned content and supply all educational text/media/translations/captions/keys/rubrics. Admin review is required for initial publication and subsequent changes.\n\nAdvanced collaboration/execution and automatic payment integrations remain staged. No educational generation feature is required.`, 'docs/archive/teacher.md'));
 for(const p of ['DEEP_DIVE_ANALYSIS_AND_ENHANCEMENTS.md','LEARNHOUSE_DEEP_DIVE_ANALYSIS.md']) write(p,entry('Superseded design analysis',`This earlier comparison/plan is retained as [historical context](docs/archive/${p}). Use [current scope](docs/PRODUCT_SCOPE.md), [architecture](docs/TARGET_ARCHITECTURE.md), [all tasks](docs/ROADMAP_BACKLOG.md) and [audit traceability](docs/AUDIT_TRACEABILITY.md) for implementation. Older AI/microservice/parity recommendations are not active requirements.`, `docs/archive/${p}`));
 write('server/README.md',entry('API server — prototype and planned architecture',`Express/Prisma/PostgreSQL modular monolith with existing JWT/refresh-session authentication. [Current scope](../docs/PRODUCT_SCOPE.md), [contracts](../docs/API_DATA_CONTRACTS.md), [tasks](../docs/ROADMAP_BACKLOG.md), [test safety](../docs/TESTING_RELEASE_GATES.md) and [operations](../docs/MIGRATION_OPERATIONS.md) are authoritative.\n\nExisting commands: npm ci; npm run dev; npm run typecheck; npm run build; npm test. Prisma generation precedes compilation. DATABASE_URL and DIRECT_URL must be separate correctly configured runtime/migration connections; tests require an isolated allowlisted test target. Do not run the existing privileged seed on live data. Current local checks and remaining release gates are in [current status](../docs/CURRENT_STATUS.md).\n\nProtected local delivery, explicit storage selection, liveness/readiness and bounded graceful HTTP shutdown are implemented; see [ENG-06 evidence](../docs/ENG06_IMPLEMENTATION.md). ENG-05 checks in an exact pre-M0 baseline and the M0 auth-version bridge; its local fixture and remote Node 22 CI pass. Production baseline adoption and representative backup/restore review remain open. The managed media library, durable workers and full shared access policy remain later work. The prototype AI module/key/SDK have been removed under SCOPE-02. No Supabase Auth migration is planned. Automated gateways and API-host code execution must remain disabled. The package is private/UNLICENSED; public source distribution still requires an owner-approved license.`, '../docs/archive/server/README.md'));
 write('client/README.md',entry('Web client — prototype and planned experience',`Next.js/React application with student, teacher and admin views. Existing commands: npm ci; npm run dev; npm run typecheck; npm run build; npm run lint. The tested toolchain is Next 16.4.2, React 19.3.1 and Tiptap 3.32.0, with lint as a separate CLI gate. API base defaults to /api/v1 or NEXT_PUBLIC_API_URL; use the intended reverse proxy and never put server secrets in NEXT_PUBLIC variables.\n\nUse [scope](../docs/PRODUCT_SCOPE.md), [architecture](../docs/TARGET_ARCHITECTURE.md), [typed contracts](../docs/API_DATA_CONTRACTS.md), [backlog](../docs/ROADMAP_BACKLOG.md) and [browser gates](../docs/TESTING_RELEASE_GATES.md). Arabic/English interface completion, ordered uploaded block rendering, exact review revisions, resumable media and reliable manual checkout are planned. UI flags do not authorize API features. The tutor UI is removed under SCOPE-02.\n\nThe expanded dashboard/session/delivery suites and development-mode checks are recorded in [the final review](../docs/M0_FINAL_REVIEW.md); full-product feature acceptance remains G1–G3. No claim of implemented HLS, sandbox isolation, guardian portal or developer delivery is made.`, '../docs/archive/client/README.md'));
 for(const p of ['audit/PRODUCT_READINESS_REVIEW.md','audit/TEST_GAP_MATRIX.md']) {
   const original = read(p);
   if(!original.startsWith('> **Historical audit')) write(p, `> **Historical audit — revised scope notice (21 October 2026).** Observations below retain their original evidence. AI generation/tutoring recommendations and AI-dependent release requirements are withdrawn. Use the [current documentation](../docs/README.md) and [explicit finding/acceptance disposition](../docs/AUDIT_TRACEABILITY.md). The original body is preserved below; it is not the current product specification.\n\n${original}`);
 }
}
module.exports={cases,writeShared};
