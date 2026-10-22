# Migration and operations plan

Refreshed **22 October 2026** against application checkpoint **d9c720f**. [Current status](CURRENT_STATUS.md) distinguishes local evidence from external holds. **Next implementation is [ENG-05](NEXT_STEPS.md#first-implementation-task--eng-05)**: reviewed migration history, populated upgrade and restore verification. This plan does not record a production operation as completed.

## M0 upgrade and production hold

M0 is an internal synthetic-data safety checkpoint. Production configuration, live credential rotation, object checksums/cutover and representative backup/restore sign-off remain mandatory before real traffic. Local tests and CI configuration do not certify those external systems.

The prototype has no baseline Prisma migration chain yet. M0 supplies the small, additive [auth-version SQL bridge](../server/prisma/upgrades/m0-auth-version.sql); ENG-05 owns the full verified baseline and ordered migrations in M1. On an existing deployment, take a backup, verify the direct migration connection, apply the bridge through the approved migration runner, compare user counts/IDs, and require a new sign-in. It adds the column if absent, advances early version-0 accounts to 1, and retains higher versions. The automated upgrade rehearsal uses a disposable prior-schema user table and confirms preservation/idempotency. It does not replace a full production-copy rehearsal.

For local test databases, `npm run db:push:test` is allowlisted for `localhost/eduplatform_test`; production `db push` and force-reset are prohibited. Keep `authVersion` and the patched security boundaries during rollback. Never restore public files, the tutor, or host execution as a rollback path. Historical accounts, scores, progress, submissions and financial records must remain intact.

Before traffic, operators must:

1. Provision a new unique administrator, retire any known prototype credentials, rotate previously used signing/provider credentials and remove one-time bootstrap environment values. Record affected-deployment investigation without putting secret values in the repository.
2. Configure the three private Supabase buckets (`lesson-videos`, `lesson-materials`, `submission-files`) and verify direct-origin anonymous reads fail. Production startup now refuses missing/public/unverifiable buckets; there is no filesystem fallback. Preserve/checksum existing objects and update legacy references through protected adapters.
3. Provision ClamAV and run actual clean/infected/unavailable/timeout canaries. Uploads fail closed while it is absent. Configure clamd's stream limit and proxy body/time limits for the supported upload ceiling; worker/quota/resumable processing remains ENH-03.
4. Rehearse the full database/private-object restore, verify retained IDs/counts/history and record the selected rollback artifact. Complete G1–G3, the full-source coverage target and the remaining browser/payment/consent/operations acceptance before onboarding real students.
5. Keep source distribution private/UNLICENSED until the owner selects a distribution license. This records an unresolved public-distribution decision; it does not assert a legal license grant.

No production deployment, credential rotation or bucket mutation was performed during this M0 implementation. The [manual guide](M0_MANUAL_TESTING.md) covers local verification.

Version **1.1 — planned operations**, 22 October 2026. This document defines work to implement and rehearse; no production migration, deployment, secret rotation or data deletion is authorized by merely generating this package. Domain task details and C01–C10 govern exact commands and schemas. CI is configured for Node 22 and separate production/development browser jobs; preserve a successful remote run for the actual release commit before onboarding.

## Preflight and preservation inventory

1. Identify environment, database/storage owners, actual schema/commit and backups. Record migration role and runtime role separately; never print connection secrets. Production must have private Supabase storage and no implicit filesystem fallback.
2. Inventory users/roles/approval/session records, courses/sections/modules/lesson IDs, preview/order, revisions, banks/quizzes/assessment attempts/scores, assignment files/grades, progress, products/subscriptions/orders/grants/vouchers, uploads/local/cloud paths and notifications/audit.
3. Export counts and stable-ID relationship checks plus checksums for all media originals. Flag orphan/two-parent/cross-course lessons, ambiguous standalone-bank owners, invalid sellable products, unknown terms, missing source rights and unknown minor consent. Reports require review; do not invent mappings or delete records to satisfy constraints.
4. Take a database snapshot plus versioned private object inventory/copy, encryption key metadata and immutable migration/audit manifest. Verify backup can restore to an isolated account before changing the live system. Raw secrets/keys require separate secure backup, not this repository.
5. Establish safe rollback boundary, operator lock, maintenance/canary window and traffic/queue drain. Freeze high-risk writes where dual-writing cannot preserve invariants. Announce only through separately authorized operational channels; these docs do not send messages.

## Expand, backfill, verify, cut over, contract

| Stage | Required behavior | Stop condition |
|---|---|---|
| Expand | Add nullable/new tables/indexes/mappings with backwards-compatible reads; baseline existing database after verified diff | Unexpected drift or incompatible old API |
| Backfill | Chunk by stable key/checkpoint, idempotent mapping/upsert under actual uniqueness, bounded locks/retries | Ambiguous ownership/term/content or count mismatch |
| Verify | Compare rows, lesson IDs/order/previews, scores/progress, order/payment totals and asset checksums; policy shadow comparison | Unexplained missing records or changed financial/grade history |
| Cut over | Switch owned readers/commands, purge unsafe caches/public aliases, require new schema/version; keep protected legacy adapters | Unauthorized old path or incompatible consumer |
| Contract | Enforce NOT NULL/FKs/uniqueness after anomalies resolved; retire old fields only after adapter deprecation | Unresolved legacy consumer or unreconciled records |

Use checked-in Prisma migrations and `migrate deploy`, never production `db push`/force reset. For an existing database, baseline only after schema diff verification and `migrate resolve` under operator review; do not run an initial create-table migration on populated tables. DIRECT_URL is the migration connection and DATABASE_URL the runtime/pool connection. Document any provider pooling constraints and least-privilege roles. CI proves both empty and representative previous-schema upgrades.

## Domain migration order

1. **Safety and identity (M0/M1):** remove static upload access and unsafe DTOs before broad rollout, replace seed provisioning, revoke affected/stale sessions, add authVersion/families/current approval checks. Inventory existing MFA secrets, encrypt with verified key access and stage enrollments without disabling old factor. Retain valid account/work history.
2. **Contracts/taxonomy:** map current stages/grades/years/subjects into coherent editions/terms/tracks/outcomes with stable IDs. Never merge solely on translated/normalized names. Add controlled singleton config and side-effect-free reads.
3. **Canonical hierarchy:** create section→CourseModule mappings, move lessons while retaining IDs, copy preview/order, resolve ambiguous parents explicitly, dedupe progress by lesson ID, compare counts, switch readers then constrain required/composite parent. Keep original section data until adapter retirement.
4. **Assets:** inventory owner/target/checksum, map local and cloud references to Asset IDs, copy privately, verify bytes, scan/probe/produce required renditions, cut over protected resource-ID adapters, then close every public bucket/static/proxy alias. Unresolved assets stay quarantined with operator recovery. Original source/submission/receipt bytes are preserved.
5. **Revisions:** snapshot current published teaching content as legacy provenance, retain last published pointer, collect actual admin sign-off before pilot. Do not fabricate historic reviewers. Teacher edits subsequently fork drafts; published references remain stable.
6. **Assessment consolidation:** map legacy Quiz/Question IDs to canonical version entities, freeze reliable definitions and preserve historical attempts/scores. Unknown original keys/snapshots are explicitly UNKNOWN; keep scores and disallow silent regrade. Existing URLs resolve adapters. Pending essays remain pending until authorized review.
7. **Commerce:** retain every historical subscription/order/payment event and original effective interval. Backfill verified resource/duration snapshots; unknown terms go to manual reconciliation, not a new default. Add scoped idempotency/unique redemption/payment source constraints after duplicate review; never drop orders/products to make FK migration pass. Archive referenced courses/products.
8. **Outbox/support/consent:** seed known durable states with stable legacy keys, no automatic resend of ambiguous old notifications, no inferred consent/rights. Implement retention/export/deletion with audited policy and legal holds. Rebuild metrics only from reliable facts; fabricated revenue remains unavailable.

Each owning task records migration SQL/Prisma files, checkpoint query, expected row counts, anomaly mapping decisions and dry-run results. Backfill can resume after restart without duplicate grants/modules/revisions. Unique indexes added after reconciliation must still handle concurrent application writes through the same new invariant.

## Asset cutover and delivery safeguards

Production bucket is private; no `getPublicUrl` for protected content. Browser gets scoped upload capability only; application JWT auth remains unchanged. Finalize rechecks actual stored bytes/size/type/hash and session authorization. Processing worker has bounded resources; output never becomes READY before scan/validation/transcoding succeeds. Scanner outage means quarantine, not a bypass.

Local driver must use an absolute protected root outside web/static mounts, bounded temporary uploads and authorized stream/download endpoints. Production startup rejects a filesystem driver. Existing files on individual instances must be copied/verified into private shared storage before multi-instance traffic; silent disk fallback is forbidden.

Student protected delivery uses the policy-checking proxy under C03. Any permitted lower-risk direct bearer URL has bounded TTL and documented revocation limits; do not treat app logout/key rotation as a way to revoke an already issued storage URL. HLS children/captions/thumbnails follow their parent visibility. Cleanup cannot remove assets referenced by historic revisions/attempts/legal holds. If public bucket closure fails, keep student delivery disabled and resolve it before release; a temporary raw-file fallback is not acceptable.

## Deployment and rollback procedure

1. Build immutable API/web/worker artifacts from lockfiles and supported pinned runtime, scan dependencies/images and identify exact schema/content contract versions. ENG-06/ENG-13 must add actual app deployment definitions; current Compose is data-service development infrastructure only.
2. Verify environment secrets, migration/runtime credentials, private storage, Redis, email sender/domain, manual payment instruction approval, HTTPS origins/proxy/cookies and capability hard-off defaults. Gateway credentials are optional while disabled; AI keys are removed. MFA encryption key has independent rotation and recovery.
3. Backup and verify restore point. Run migrations under one deploy operator. Pause affected write admission if an expand/backfill step cannot coexist with old code; keep readonly access only where safe.
4. Deploy compatible API/worker canary, run readiness and direct policy/capability probes, then web. Dispatchers/consumers handle mixed event versions explicitly; unknown versions dead-letter rather than corrupt data.
5. Purge unsafe public caches/aliases. Run synthetic guest/student A/B/teacher A/B/admin journeys: preview/private read, version review, attempt deadline/manual grade, submission file, manual payment/voucher and both locales. Confirm ledger/progress/audit effects.
6. Increase traffic only inside defined pilot limits, watch agreed indicators, retain quick server kill switches and named operator ownership. Record exact release evidence.
7. On failure: disable affected admissions/capability, stop readiness/route traffic, preserve jobs/logs, reconcile any committed payments/grants, then roll back code only to a schema-compatible security-patched version. If new data exists, prefer forward fix. Never return to old public files/key leaks/role bypass/host execution.

Database down migrations that discard student work/payment events are not a rollback strategy. Restore from backup is a disaster-recovery decision with a known data-loss window; reconcile later financial events and deletion ledger before reopening. Content rollback swaps to a previous approved immutable snapshot with audit, not in-place editing. Payment corrections are compensating ledger events, never row deletion.

## Durable worker recovery

Postgres outbox is authoritative; Redis/BullMQ transport may be rebuilt. Dispatcher locks/claims a batch, enqueues at least once and records progress; consumer unique effect key makes duplicates safe. Record attempt count/next available time/failure code. Default delivery/media max five attempts with exponential backoff/jitter, then dead-letter for authorized replay. Serialization transaction retries max three are separate from job retries.

Media jobs checkpoint by asset version/rendition; upload finalization and quota release each occur once. Notifications unique by event/recipient/channel; operator replay does not duplicate inbox. Payment reconciliation dedupes by order/payment event/source grant. Support/export/deletion jobs track item completion and cannot mark a partial request completed. Paused queues preserve durable state and show honest pending UI.

## Monitoring and capacity budgets

Before G3, name dashboard/alert owner and baseline each threshold against pilot load. Initial objectives: normal API p95 <500 ms excluding byte transfer/processing; server errors <1% over five minutes; critical payment/authorization failures page immediately; outbox oldest pending >60 seconds and payment paid-unfulfilled >5 minutes alert. These are proposed measurable launch budgets, tuned with recorded load tests, not claims of current performance. Processing/media queue thresholds are asset-size dependent and documented per rendition budget.

Track readiness, DB pool saturation/query time, Redis connectivity, outbox lag/retries/dead letters, quota reservations vs actual bytes, upload abandonment, scan/transcode failure/duration, stream failures/range status, auth-version denials/replay, manual review age, paid-unfulfilled/refund pending, email delivery failures, content review/issue age and privacy request age. Logs carry safe request/entity/actor/error IDs; redact tokens/query signatures, answer keys, passwords and sensitive bodies. Protect operator dashboards from public access.

Measure actual catalog scale/page latency and API upload memory/concurrency; lazy-load heavy editors/player modules where results warrant it. Shared Redis rate limits apply across instances; sensitive creation fails closed if global quota cannot be checked, public reads may use conservative fallback limits. Document that choice per endpoint.

## Backup, restore and incident drills

Proposed G3 service objectives: PostgreSQL PITR RPO <=15 minutes, recovery RTO <=4 hours, subject to verified infrastructure support; otherwise restrict pilot until owner accepts a measured alternative. Private asset originals/versioned copies, database and encryption-key recovery metadata must align. Configure encrypted backups, restricted restore roles and approved retention, plus daily completion checks and at least monthly isolated restore rehearsal. No legal retention duration is guessed here.

Restore drill: recover database + assets + required key version to an isolated environment, replay durable events safely, compare orders/amounts/grants, lesson/attempt/score/progress counts and checksums; replay deletion ledger before exposing restored personal data. Prove cross-account policies and disabled flags before switching traffic. Record recovery timing, gaps, operator and reconciliation actions. Asset and DB backups without a working encryption key are not verified recoverability.

Incident examples to rehearse: leaked seed credential (rotate/revoke with evidence), public object exposure (close aliases/inventory access and affected users), content error (retract and reviewed replacement), paid-unfulfilled (reconcile grant once), duplicate/refund (compensating event), scanner/storage outage (quarantine/pending), DB/queue failure (readiness/drain/replay) and missing consent (pause affected onboarding/processing and use support). Follow reviewed notification/privacy policy; these docs do not send external messages or assert legal conclusions.

## Human operational ownership

G3 requires actual named people for content review/rights, account recovery, consent/privacy retention, manual settlement/refund/reconciliation, support escalation, security incidents, storage/worker/deployment/backup and release decisions. ENH-16 defines support hours/SLA and retention classes with qualified policy review; ENH-11 separates minimal launch consent from staged guardian portal. Until owners/policies exist, do not claim an unattended production product.
