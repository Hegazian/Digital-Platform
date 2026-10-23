# Milestone 1 release closure

Status: **NOT RELEASE READY**. Local review and verification do not complete G1. The approved M1 scope contains **25 tasks: 0 Complete, 4 In Progress, 21 Planned**. ENG-13 additionally continues across milestones for CI, test safety and coverage. The full scope remains in [G1](TESTING_RELEASE_GATES.md#gate-g1--durable-foundation-m1); unfinished functionality is not removed to make the release appear complete.

## Review and verification

The [M1 review](M1_REVIEW.md) and [machine-readable evidence](../audit/m1-review/verification.json) distinguish introduced defects, their fixes, planned work and unexecuted acceptance. Current release-review disposition: **Introduced CI-test defect resolved; M1 implementation and external release gates remain open**.

- Server: 442 passed / 0 skipped across 81 files. Windows exercises the registered shutdown handler through test-only IPC; native Linux execution remains a CI requirement.
- Client: 90 tests across 17 files; latest recorded lint is 0 errors / 27 warnings.
- Current whole-source coverage (statements / branches / functions / lines): server 73.92% / 66.49% / 90.27% / 75.15%; client 19.34% / 18.94% / 13.39% / 18.86%. [Uncovered/partial files](../audit/m1-review/coverage-gaps.json) remain assigned to their domain tasks; G3 targets are unmet.
- Browser: production 32 passed and development 32 passed; these modes repeat desktop/Pixel emulation scenarios, not physical-device acceptance.
- Migration fixture: 3 migrations, 22 synthetic rows / 21 tables preserved. This does not establish a representative backup/restore rehearsal.
- Remote CI: No current M1 pass verified: no branch PR or commit status checks returned for ad920ce; final reviewed-fix commit still requires Linux CI. A prior commit's result cannot validate later changes.

| Review finding | Owning task | Disposition | Required regression |
|---|---|---|---|
| M1-R05 — Settle the stalled database fixture before asserting shutdown exit | [ENG-06](tasks/ENG-06.md) | Resolved | Focused shutdown process test passed locally without skips; independent read-only recheck confirms the fix. Native Linux SIGTERM execution still requires CI. |

## Remaining M1 work

Each task below retains its implementation steps, migration/compatibility requirements and acceptance tests. Planned means the full task has not been implemented or verified; prototype code and partial M0 repairs do not complete it.

| Task | Status | Required outcome | Dependencies |
|---|---|---|---|
| [SEC-06](tasks/SEC-06.md) | Planned | PUBLIC is discoverable; UNLISTED is link-discoverable metadata only; PRIVATE metadata requires owner/admin or active assigned membership. Learning always requires its own access decision. | [SEC-04](archive/completed/M0/SEC-04.md), [COM-01](tasks/COM-01.md) |
| [SEC-07](tasks/SEC-07.md) | Planned | Approved teachers may read keys or edit only owned/explicitly assigned assessments and banks; sharing is an explicit grant. | [SEC-05](archive/completed/M0/SEC-05.md), [ENG-05](tasks/ENG-05.md) |
| [SEC-12](tasks/SEC-12.md) | Planned | Read and write authorization follows current course access and parent relationships for discussions, assignments and private banks. | [COM-01](tasks/COM-01.md), [SEC-07](tasks/SEC-07.md) |
| [SEC-13](tasks/SEC-13.md) | Planned | One refresh token creates at most one successor; ordinary tab races are recoverable without revoking unrelated sessions. | [SEC-10](archive/completed/M0/SEC-10.md), [ENG-05](tasks/ENG-05.md) |
| [SEC-14](tasks/SEC-14.md) | Planned | New factor enrollment cannot disable an existing factor; secrets are encrypted and recovery/replay handling is atomic. | [SEC-10](archive/completed/M0/SEC-10.md), [ENG-05](tasks/ENG-05.md) |
| [COM-01](tasks/COM-01.md) | Planned | AccessPolicy is the sole owner of effective learning decisions and audience membership across subscriptions, grants, purchases, bundles, vouchers and free enrollment. | [SEC-04](archive/completed/M0/SEC-04.md), [COM-09](tasks/COM-09.md), [ENH-02](tasks/ENH-02.md) |
| [COM-02](tasks/COM-02.md) | Planned | Renewal uses effective dates, even when a historic row still says ACTIVE; reconciliation cannot be required for a student to renew. | [COM-03](tasks/COM-03.md), [COM-09](tasks/COM-09.md) |
| [COM-03](tasks/COM-03.md) | Planned | Calendar products clamp month ends in Africa/Cairo and approve/reject is a conditional one-way decision. | [ENG-05](tasks/ENG-05.md) |
| [COM-05](tasks/COM-05.md) | Planned | A retry returns the original caller’s identical order; no key can reveal another account’s order or silently change the purchase. | [ENG-05](tasks/ENG-05.md) |
| [COM-06](tasks/COM-06.md) | Planned | Verified manual decisions and later provider events follow one state machine with an immutable ledger, exact-once access effects and reversible grants on refund. | [COM-05](tasks/COM-05.md), [ENG-05](tasks/ENG-05.md), [ENG-07](tasks/ENG-07.md), [ENH-02](tasks/ENH-02.md) |
| [COM-07](tasks/COM-07.md) | Planned | Every sellable product identifies a valid resource, integer EGP amount and explicit duration; paid orders grant the exact purchased snapshot. | [COM-06](tasks/COM-06.md), [COM-03](tasks/COM-03.md) |
| [COM-09](tasks/COM-09.md) | Planned | Effective grants require startsAt <= now < expiresAt and no revocation. Archive stops discovery/new sales while retaining existing purchased access; explicit retraction denies student learning. | [ENG-05](tasks/ENG-05.md) |
| [COM-11](tasks/COM-11.md) | Planned | Course/product/pricing changes are transactional; deletion becomes archival when historical orders or student work reference a resource. | [COM-07](tasks/COM-07.md) |
| [LRN-07](tasks/LRN-07.md) | Planned | Course -> CourseModule (displayed as module/unit) -> Lesson is canonical; legacy sections become modules without losing IDs/progress/previews/order. | [ENG-05](tasks/ENG-05.md), [ENH-02](tasks/ENH-02.md) |
| [ENG-02](tasks/ENG-02.md) | In Progress | Supported exchange-rate configuration round-trips honestly; EGP is the only writable charge currency and optional USD conversions are indicative display values. | [ENG-01](archive/completed/M0/ENG-01.md) |
| [ENG-04](tasks/ENG-04.md) | Planned | Each route is classified and validates body/query/params/multipart metadata and cross-resource relationships; missing validateBody is not automatically a proven defect. | [ENH-02](tasks/ENH-02.md), [ENG-01](archive/completed/M0/ENG-01.md) |
| [ENG-05](tasks/ENG-05.md) | In Progress | New databases and verified legacy databases use an exact, immutable pre-M0 Prisma baseline plus the idempotent auth-version migration. Schema adoption requires a read-only diff against a restored copy. | None |
| [ENG-06](tasks/ENG-06.md) | In Progress | Liveness is separate from readiness; required dependency failure returns 503, graceful shutdown drains work and production storage cannot silently become local disk. | None |
| [ENG-07](tasks/ENG-07.md) | Planned | Important mutations and their actual actor/audit/outbox records commit together; memory fallback never reports durable success. | [ENG-05](tasks/ENG-05.md) |
| [ENG-08](tasks/ENG-08.md) | Planned | GET config/subjects/careers never seeds or rewrites data; singleton/config and taxonomy uniqueness are enforced in the database. | [ENG-05](tasks/ENG-05.md), [ENH-01](tasks/ENH-01.md) |
| [ENG-09](tasks/ENG-09.md) | In Progress | Existing video uploads use bounded private disk staging and streams to storage without retaining a request-sized buffer. Range responses are strict; new uploads remain PROCESSING until ENH-03 verifies codecs and media metadata. | [SEC-03](archive/completed/M0/SEC-03.md) |
| [ENG-14](tasks/ENG-14.md) | Planned | Protected auth/profile calls can refresh; retryable refresh failure preserves session intent and identity-specific local state is scoped/reset. | [SEC-13](tasks/SEC-13.md) |
| [ENH-01](tasks/ENH-01.md) | Planned | Admin-configured stages, grades, tracks, academic years, terms, subjects, curriculum editions and learning outcomes cover all Egyptian school stages without hardcoded commercial tracks. | [ENG-05](tasks/ENG-05.md) |
| [ENH-02](tasks/ENH-02.md) | Planned | One versioned workspace package defines safe DTOs, command inputs, enums, validation and OpenAPI for existing Express and Next applications. | [ENG-05](tasks/ENG-05.md) |
| [ENH-03](tasks/ENH-03.md) | Planned | Asset IDs own private originals/renditions, quotas and processing lifecycle; production Supabase resumable uploads and local protected streaming use existing app identity. | [SEC-02](archive/completed/M0/SEC-02.md), [SEC-03](archive/completed/M0/SEC-03.md), [ENG-05](tasks/ENG-05.md), [ENG-06](tasks/ENG-06.md), [ENG-07](tasks/ENG-07.md), [ENH-02](tasks/ENH-02.md), [ENG-09](tasks/ENG-09.md) |

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

Completed task specifications are moved out of docs/tasks into docs/archive/completed under their original milestone, with links rewritten and IDs retained. The current archive contains 15 records. Unfinished tasks remain in the active backlog; historical audit reports and preservation checksums are retained. See [the archive index](archive/completed/README.md) and [all task dispositions](ROADMAP_BACKLOG.md).
