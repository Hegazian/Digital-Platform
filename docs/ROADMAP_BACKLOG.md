# Roadmap and implementation backlog

Tasks begin **Planned**. Priorities P0=immediate blocker, P1=required correctness/security, P2=important completeness/quality. Milestones are dependency gates, not calendar estimates. Status changes require exact implementation/test evidence; the documentation delivery does not complete engineering tasks.

Updated **24 October 2026**: **15 archived Complete / 13 In Progress / 49 Planned**. See [current evidence](CURRENT_STATUS.md), [the historical M0 review](M0_FINAL_REVIEW.md), [the M1 review](M1_REVIEW.md), and [the next-steps handoff](NEXT_STEPS.md). Completed task specifications are [archived](archive/completed/README.md) and excluded from this execution queue.

## Milestones and release assignment

| Milestone | Exit / scope | Gate |
|---|---|---|
| M0 — Scope and immediate safety | AI exposure removed, build/test safety, known credentials/files/keys/actor/role leaks repaired, dependency triage/remediation | G0 safe internal build |
| M1 — Foundation and content delivery | Migrations, typed contracts, academic registry, canonical hierarchy, private assets, shared access and session correctness | G1 durable foundation |
| M2 — Authoring and learning | Human editors/imports, reviewed revisions, player, versioned assessments, assignments, progress, accessible bilingual UX | G2 complete learning |
| M3 — Paid release and operations | Manual payment/vouchers, recovery/support/consent/retention, actual metrics, monitoring/backup/production CI and limited pilot | G3 controlled paid pilot |
| M4 — Post-launch | Provider adapters, guardian portal, certificates, offline, collaboration, isolated execution and developer integrations | G4 individual enablement |

M0 ENG-13 establishes the harness and resolves/triages dependency exposure. Later tasks add their regression evidence; G3 reruns complete CI. COM-04 is assigned M3 for launch containment, with **Paymob and Fawry enablement in M4**. ENH-11 is assigned M3 for minimal consent, with **guardian portal in M4**. ENG-03 disables incomplete integrations from M0. A task with a staged subdeliverable is not globally Completed merely because containment passed; track each subgate in its evidence checklist.

M0's engineering/G0 checkpoint is finalized for internal synthetic data. ENG-13 remains In Progress for its later full-product coverage obligation; its M0 harness/dependency subgate passed. Production holds are explicit in [M0 status](archive/reviews/M0_IMPLEMENTATION_STATUS.md).

## Active backlog (62 tasks)

| ID / title | Priority | Milestone | Status | Dependencies |
|---|---|---|---|---|
| [SEC-06](tasks/SEC-06.md) — Enforce public, unlisted and private visibility consistently | P1 | M1 | In Progress | [SEC-04](archive/completed/M0/SEC-04.md), [COM-01](tasks/COM-01.md) |
| [SEC-07](tasks/SEC-07.md) — Scope quiz and question-bank privileges to owners and assignments | P1 | M1 | In Progress | [SEC-05](archive/completed/M0/SEC-05.md), [ENG-05](tasks/ENG-05.md) |
| [SEC-12](tasks/SEC-12.md) — Apply learning access to discussions, assignments and banks | P1 | M1 | In Progress | [COM-01](tasks/COM-01.md), [SEC-07](tasks/SEC-07.md) |
| [SEC-13](tasks/SEC-13.md) — Consume refresh tokens atomically and define tab-race handling | P1 | M1 | In Progress | [SEC-10](archive/completed/M0/SEC-10.md), [ENG-05](tasks/ENG-05.md) |
| [SEC-14](tasks/SEC-14.md) — Complete secure MFA enrollment and recovery | P2 | M1 | In Progress | [SEC-10](archive/completed/M0/SEC-10.md), [ENG-05](tasks/ENG-05.md) |
| [COM-01](tasks/COM-01.md) — Unify access decisions across all learning surfaces | P1 | M1 | In Progress | [SEC-04](archive/completed/M0/SEC-04.md), [COM-09](tasks/COM-09.md), [ENH-02](tasks/ENH-02.md) |
| [COM-02](tasks/COM-02.md) — Allow renewal after effective subscription expiry | P1 | M1 | Planned | [COM-03](tasks/COM-03.md), [COM-09](tasks/COM-09.md) |
| [COM-03](tasks/COM-03.md) — Define calendar durations and atomic subscription review | P2 | M1 | Planned | [ENG-05](tasks/ENG-05.md) |
| [COM-04](tasks/COM-04.md) — Disable simulated gateways and implement official adapters later | P1 | M3 | Planned | [ENG-03](archive/completed/M0/ENG-03.md), [COM-06](tasks/COM-06.md), [COM-07](tasks/COM-07.md) |
| [COM-05](tasks/COM-05.md) — Scope checkout idempotency by actor and payload | P1 | M1 | Planned | [ENG-05](tasks/ENG-05.md) |
| [COM-06](tasks/COM-06.md) — Make payment transitions auditable and fulfillment recoverable | P1 | M1 | Planned | [COM-05](tasks/COM-05.md), [ENG-05](tasks/ENG-05.md), [ENG-07](tasks/ENG-07.md), [ENH-02](tasks/ENH-02.md) |
| [COM-07](tasks/COM-07.md) — Validate products and snapshot explicit access durations | P1 | M1 | Planned | [COM-06](tasks/COM-06.md), [COM-03](tasks/COM-03.md) |
| [COM-08](tasks/COM-08.md) — Make voucher redemption unique per student | P1 | M3 | Planned | [COM-06](tasks/COM-06.md), [COM-07](tasks/COM-07.md) |
| [COM-09](tasks/COM-09.md) — Define effective dates, archival and retraction semantics | P1 | M1 | In Progress | [ENG-05](tasks/ENG-05.md) |
| [COM-10](tasks/COM-10.md) — Use effective audiences and real ledger metrics | P1 | M2 | Planned | [COM-01](tasks/COM-01.md), [COM-06](tasks/COM-06.md) |
| [COM-11](tasks/COM-11.md) — Make course pricing atomic and preserve purchase history | P1 | M1 | Planned | [COM-07](tasks/COM-07.md) |
| [COM-12](tasks/COM-12.md) — Complete resumable manual checkout and receipt review | P2 | M3 | Planned | [COM-05](tasks/COM-05.md), [COM-06](tasks/COM-06.md), [COM-07](tasks/COM-07.md), [ENH-03](tasks/ENH-03.md) |
| [LRN-01](tasks/LRN-01.md) — Persist expiry before returning a quiz error | P1 | M2 | Planned | [ENG-05](tasks/ENG-05.md) |
| [LRN-02](tasks/LRN-02.md) — Unify versioned assessment definitions and frozen attempts | P1 | M2 | Planned | [SEC-07](tasks/SEC-07.md), [ENH-02](tasks/ENH-02.md) |
| [LRN-03](tasks/LRN-03.md) — Implement per-type grading and human rubric review | P1 | M2 | Planned | [LRN-02](tasks/LRN-02.md), [SEC-08](archive/completed/M0/SEC-08.md) |
| [LRN-04](tasks/LRN-04.md) — Serialize assignment attempts and assessment submission | P1 | M2 | Planned | [LRN-02](tasks/LRN-02.md), [ENH-03](tasks/ENH-03.md) |
| [LRN-05](tasks/LRN-05.md) — Publish only exact reviewed immutable content revisions | P1 | M2 | Planned | [LRN-07](tasks/LRN-07.md), [ENH-02](tasks/ENH-02.md), [SEC-10](archive/completed/M0/SEC-10.md), [LRN-02](tasks/LRN-02.md), [ENH-03](tasks/ENH-03.md), [ENG-07](tasks/ENG-07.md) |
| [LRN-06](tasks/LRN-06.md) — Render every supported ordered lesson block | P1 | M2 | Planned | [LRN-05](tasks/LRN-05.md), [SEC-04](archive/completed/M0/SEC-04.md), [ENH-03](tasks/ENH-03.md) |
| [LRN-07](tasks/LRN-07.md) — Migrate sections to one canonical module hierarchy | P1 | M1 | Planned | [ENG-05](tasks/ENG-05.md), [ENH-02](tasks/ENH-02.md) |
| [LRN-08](tasks/LRN-08.md) — Contain incomplete boards and preserve block identity | P1 | M2 | Planned | [LRN-06](tasks/LRN-06.md), [ENG-03](archive/completed/M0/ENG-03.md) |
| [LRN-09](tasks/LRN-09.md) — Authorize previews per lesson | P1 | M2 | Planned | [COM-01](tasks/COM-01.md), [LRN-07](tasks/LRN-07.md), [SEC-02](archive/completed/M0/SEC-02.md) |
| [LRN-10](tasks/LRN-10.md) — Resume attempts from server deadlines and saved answers | P1 | M2 | Planned | [LRN-02](tasks/LRN-02.md), [LRN-04](tasks/LRN-04.md) |
| [LRN-11](tasks/LRN-11.md) — Handle already-expired assessment timer responses safely | P1 | M2 | Planned | None |
| [LRN-12](tasks/LRN-12.md) — Persist bounded watch progress and reliable completion | P1 | M2 | Planned | [LRN-07](tasks/LRN-07.md), [COM-01](tasks/COM-01.md) |
| [LRN-13](tasks/LRN-13.md) — Send validated announcements to owned-course audiences | P1 | M2 | Planned | [SEC-09](archive/completed/M0/SEC-09.md), [COM-10](tasks/COM-10.md), [ENH-10](tasks/ENH-10.md) |
| [LRN-14](tasks/LRN-14.md) — Use validated teacher-provided live meeting links | P1 | M2 | Planned | [SEC-09](archive/completed/M0/SEC-09.md), [ENH-02](tasks/ENH-02.md), [COM-01](tasks/COM-01.md) |
| [LRN-15](tasks/LRN-15.md) — Repair catalog routing, search, filters and pagination | P2 | M2 | Planned | [SEC-06](tasks/SEC-06.md), [ENH-01](tasks/ENH-01.md), [ENH-02](tasks/ENH-02.md) |
| [LRN-16](tasks/LRN-16.md) — Complete Arabic/English interface and uploader-supplied locales | P1 | M2 | Planned | [ENH-02](tasks/ENH-02.md), [ENH-01](tasks/ENH-01.md) |
| [ENG-02](tasks/ENG-02.md) — Make config updates persist and keep EGP charge semantics | P1 | M1 | In Progress | [ENG-01](archive/completed/M0/ENG-01.md) |
| [ENG-04](tasks/ENG-04.md) — Validate every request boundary with shared schemas | P1 | M1 | Planned | [ENH-02](tasks/ENH-02.md), [ENG-01](archive/completed/M0/ENG-01.md) |
| [ENG-05](tasks/ENG-05.md) — Introduce versioned migrations and upgrade verification | P1 | M1 | In Progress | None |
| [ENG-06](tasks/ENG-06.md) — Make readiness, shutdown and storage outages honest | P1 | M1 | In Progress | None |
| [ENG-07](tasks/ENG-07.md) — Persist actual audit actors and durable outbox events | P1 | M1 | Planned | [ENG-05](tasks/ENG-05.md) |
| [ENG-08](tasks/ENG-08.md) — Make public reads side-effect free and reference keys unique | P2 | M1 | Planned | [ENG-05](tasks/ENG-05.md), [ENH-01](tasks/ENH-01.md) |
| [ENG-09](tasks/ENG-09.md) — Bound existing media handling and stream ranges correctly | P1 | M1 | In Progress | [SEC-03](archive/completed/M0/SEC-03.md) |
| [ENG-10](tasks/ENG-10.md) — Bound queries, shared rate limits and sensitive logging | P2 | M3 | Planned | [SEC-04](archive/completed/M0/SEC-04.md), [LRN-15](tasks/LRN-15.md), [ENG-07](tasks/ENG-07.md) |
| [ENG-11](tasks/ENG-11.md) — Add verification, password recovery and secure account changes | P1 | M3 | Planned | [SEC-10](archive/completed/M0/SEC-10.md), [SEC-13](tasks/SEC-13.md), [ENG-07](tasks/ENG-07.md), [ENH-10](tasks/ENH-10.md) |
| [ENG-12](tasks/ENG-12.md) — Gate developer integrations and specify complete later enablement | P2 | M4 | Planned | [ENG-03](archive/completed/M0/ENG-03.md), [ENG-07](tasks/ENG-07.md), [ENH-02](tasks/ENH-02.md) |
| [ENG-13](tasks/ENG-13.md) — Build trustworthy isolated tests and production CI gates | P1 | M0 | In Progress | None |
| [ENG-14](tasks/ENG-14.md) — Recover client sessions without discarding retryable failures | P1 | M1 | Planned | [SEC-13](tasks/SEC-13.md) |
| [ENH-01](tasks/ENH-01.md) — Model all Egyptian stages and versioned curriculum metadata | P1 | M1 | Planned | [ENG-05](tasks/ENG-05.md) |
| [ENH-02](tasks/ENH-02.md) — Publish shared typed contracts and executable validation | P1 | M1 | In Progress | [ENG-05](tasks/ENG-05.md) |
| [ENH-03](tasks/ENH-03.md) — Build private managed media with resumable uploads and processing | P1 | M1 | Planned | [SEC-02](archive/completed/M0/SEC-02.md), [SEC-03](archive/completed/M0/SEC-03.md), [ENG-05](tasks/ENG-05.md), [ENG-06](tasks/ENG-06.md), [ENG-07](tasks/ENG-07.md), [ENH-02](tasks/ENH-02.md), [ENG-09](tasks/ENG-09.md) |
| [ENH-04](tasks/ENH-04.md) — Import versioned assessments and assignments safely | P1 | M2 | Planned | [LRN-02](tasks/LRN-02.md), [LRN-03](tasks/LRN-03.md), [LRN-05](tasks/LRN-05.md), [ENH-03](tasks/ENH-03.md), [ENH-02](tasks/ENH-02.md) |
| [ENH-05](tasks/ENH-05.md) — Track content provenance, permissions and correction reports | P1 | M2 | Planned | [LRN-05](tasks/LRN-05.md), [ENH-01](tasks/ENH-01.md), [ENH-03](tasks/ENH-03.md) |
| [ENH-06](tasks/ENH-06.md) — Complete teacher/admin manual authoring from draft to publication | P1 | M2 | Planned | [LRN-05](tasks/LRN-05.md), [LRN-06](tasks/LRN-06.md), [ENH-03](tasks/ENH-03.md), [ENH-04](tasks/ENH-04.md), [ENH-05](tasks/ENH-05.md), [LRN-16](tasks/LRN-16.md) |
| [ENH-07](tasks/ENH-07.md) — Present uploaded captions, transcripts and accessible lessons | P1 | M2 | Planned | [ENH-03](tasks/ENH-03.md), [LRN-06](tasks/LRN-06.md), [LRN-16](tasks/LRN-16.md) |
| [ENH-08](tasks/ENH-08.md) — Add entitled search, bookmarks and private student notes | P2 | M4 | Planned | [LRN-15](tasks/LRN-15.md), [COM-01](tasks/COM-01.md), [LRN-05](tasks/LRN-05.md) |
| [ENH-09](tasks/ENH-09.md) — Provide deterministic mastery and revision practice | P2 | M4 | Planned | [LRN-03](tasks/LRN-03.md), [LRN-12](tasks/LRN-12.md), [ENH-01](tasks/ENH-01.md) |
| [ENH-10](tasks/ENH-10.md) — Deliver durable notifications and communication preferences | P1 | M2 | Planned | [ENG-07](tasks/ENG-07.md), [COM-01](tasks/COM-01.md) |
| [ENH-11](tasks/ENH-11.md) — Establish minor consent now and stage a guardian portal | P1 | M3 | Planned | [ENG-11](tasks/ENG-11.md), [ENH-16](tasks/ENH-16.md) |
| [ENH-12](tasks/ENH-12.md) — Issue auditable certificates with privacy-safe verification | P2 | M4 | Planned | [LRN-03](tasks/LRN-03.md), [LRN-12](tasks/LRN-12.md), [ENG-07](tasks/ENG-07.md) |
| [ENH-13](tasks/ENH-13.md) — Offer rights-controlled expiring offline study packs | P2 | M4 | Planned | [ENH-03](tasks/ENH-03.md), [COM-01](tasks/COM-01.md), [LRN-05](tasks/LRN-05.md), [ENH-16](tasks/ENH-16.md) |
| [ENH-14](tasks/ENH-14.md) — Implement scoped realtime collaborative whiteboards | P2 | M4 | Planned | [LRN-08](tasks/LRN-08.md), [COM-01](tasks/COM-01.md), [ENG-07](tasks/ENG-07.md) |
| [ENH-15](tasks/ENH-15.md) — Move untrusted code to a separate isolated executor | P1 | M4 | Planned | [SEC-15](archive/completed/M0/SEC-15.md), [ENG-07](tasks/ENG-07.md), [COM-01](tasks/COM-01.md) |
| [ENH-16](tasks/ENH-16.md) — Provide support and operational privacy/retention workflows | P1 | M3 | Planned | [ENG-07](tasks/ENG-07.md), [ENH-05](tasks/ENH-05.md) |
| [ENH-17](tasks/ENH-17.md) — Measure real educational, editorial and commercial outcomes | P2 | M3 | Planned | [COM-10](tasks/COM-10.md), [LRN-03](tasks/LRN-03.md), [LRN-12](tasks/LRN-12.md), [LRN-05](tasks/LRN-05.md), [ENG-07](tasks/ENG-07.md) |

## Remaining execution queue

**Keep M1-R01–R04 regressions green under ENG-09/ENG-02**, complete ENG-05/06 operational evidence and continue ENG-13, then use the [five M1 waves](NEXT_STEPS.md#m1-implementation-waves). The dependency graph below is the complete reference; this queue excludes Complete tasks:

- **M0:** [ENG-13](tasks/ENG-13.md) (continuing)
- **M1:** [ENG-05](tasks/ENG-05.md) (continuing), [COM-09](tasks/COM-09.md) (continuing), [ENH-02](tasks/ENH-02.md) (continuing), [COM-01](tasks/COM-01.md) (continuing), [SEC-06](tasks/SEC-06.md) (continuing), [SEC-07](tasks/SEC-07.md) (continuing), [SEC-12](tasks/SEC-12.md) (continuing), [SEC-13](tasks/SEC-13.md) (continuing), [SEC-14](tasks/SEC-14.md) (continuing), [COM-03](tasks/COM-03.md), [COM-02](tasks/COM-02.md), [COM-05](tasks/COM-05.md), [ENG-07](tasks/ENG-07.md), [COM-06](tasks/COM-06.md), [COM-07](tasks/COM-07.md), [COM-11](tasks/COM-11.md), [LRN-07](tasks/LRN-07.md), [ENG-02](tasks/ENG-02.md) (continuing), [ENG-04](tasks/ENG-04.md), [ENG-06](tasks/ENG-06.md) (continuing), [ENH-01](tasks/ENH-01.md), [ENG-08](tasks/ENG-08.md), [ENG-09](tasks/ENG-09.md) (continuing), [ENG-14](tasks/ENG-14.md), [ENH-03](tasks/ENH-03.md)
- **M2:** [COM-10](tasks/COM-10.md), [LRN-01](tasks/LRN-01.md), [LRN-02](tasks/LRN-02.md), [LRN-03](tasks/LRN-03.md), [LRN-04](tasks/LRN-04.md), [LRN-05](tasks/LRN-05.md), [LRN-06](tasks/LRN-06.md), [LRN-08](tasks/LRN-08.md), [LRN-09](tasks/LRN-09.md), [LRN-10](tasks/LRN-10.md), [LRN-11](tasks/LRN-11.md), [LRN-12](tasks/LRN-12.md), [ENH-10](tasks/ENH-10.md), [LRN-13](tasks/LRN-13.md), [LRN-14](tasks/LRN-14.md), [LRN-15](tasks/LRN-15.md), [LRN-16](tasks/LRN-16.md), [ENH-04](tasks/ENH-04.md), [ENH-05](tasks/ENH-05.md), [ENH-06](tasks/ENH-06.md), [ENH-07](tasks/ENH-07.md)
- **M3:** [COM-04](tasks/COM-04.md), [COM-08](tasks/COM-08.md), [COM-12](tasks/COM-12.md), [ENG-10](tasks/ENG-10.md), [ENG-11](tasks/ENG-11.md), [ENH-16](tasks/ENH-16.md), [ENH-11](tasks/ENH-11.md), [ENH-17](tasks/ENH-17.md)
- **M4:** [ENG-12](tasks/ENG-12.md), [ENH-08](tasks/ENH-08.md), [ENH-09](tasks/ENH-09.md), [ENH-12](tasks/ENH-12.md), [ENH-13](tasks/ENH-13.md), [ENH-14](tasks/ENH-14.md), [ENH-15](tasks/ENH-15.md)

## Ordered implementation sequence

This is one valid dependency-respecting sequence. Tasks with satisfied dependencies may proceed independently; phase gates still apply. Shared owners in [architecture](TARGET_ARCHITECTURE.md#implementation-ownership) prevent parallel duplicate engines.

### M0 — Scope and immediate safety

1. [ENG-13](tasks/ENG-13.md) — Build trustworthy isolated tests and production CI gates

### M1 — Foundation and content delivery

1. [ENG-05](tasks/ENG-05.md) — Introduce versioned migrations and upgrade verification
2. [COM-09](tasks/COM-09.md) — Define effective dates, archival and retraction semantics
3. [ENH-02](tasks/ENH-02.md) — Publish shared typed contracts and executable validation
4. [COM-01](tasks/COM-01.md) — Unify access decisions across all learning surfaces
5. [SEC-06](tasks/SEC-06.md) — Enforce public, unlisted and private visibility consistently
6. [SEC-07](tasks/SEC-07.md) — Scope quiz and question-bank privileges to owners and assignments
7. [SEC-12](tasks/SEC-12.md) — Apply learning access to discussions, assignments and banks
8. [SEC-13](tasks/SEC-13.md) — Consume refresh tokens atomically and define tab-race handling
9. [SEC-14](tasks/SEC-14.md) — Complete secure MFA enrollment and recovery
10. [COM-03](tasks/COM-03.md) — Define calendar durations and atomic subscription review
11. [COM-02](tasks/COM-02.md) — Allow renewal after effective subscription expiry
12. [COM-05](tasks/COM-05.md) — Scope checkout idempotency by actor and payload
13. [ENG-07](tasks/ENG-07.md) — Persist actual audit actors and durable outbox events
14. [COM-06](tasks/COM-06.md) — Make payment transitions auditable and fulfillment recoverable
15. [COM-07](tasks/COM-07.md) — Validate products and snapshot explicit access durations
16. [COM-11](tasks/COM-11.md) — Make course pricing atomic and preserve purchase history
17. [LRN-07](tasks/LRN-07.md) — Migrate sections to one canonical module hierarchy
18. [ENG-02](tasks/ENG-02.md) — Make config updates persist and keep EGP charge semantics
19. [ENG-04](tasks/ENG-04.md) — Validate every request boundary with shared schemas
20. [ENG-06](tasks/ENG-06.md) — Make readiness, shutdown and storage outages honest
21. [ENH-01](tasks/ENH-01.md) — Model all Egyptian stages and versioned curriculum metadata
22. [ENG-08](tasks/ENG-08.md) — Make public reads side-effect free and reference keys unique
23. [ENG-09](tasks/ENG-09.md) — Bound existing media handling and stream ranges correctly
24. [ENG-14](tasks/ENG-14.md) — Recover client sessions without discarding retryable failures
25. [ENH-03](tasks/ENH-03.md) — Build private managed media with resumable uploads and processing

### M2 — Authoring and learning

1. [COM-10](tasks/COM-10.md) — Use effective audiences and real ledger metrics
2. [LRN-01](tasks/LRN-01.md) — Persist expiry before returning a quiz error
3. [LRN-02](tasks/LRN-02.md) — Unify versioned assessment definitions and frozen attempts
4. [LRN-03](tasks/LRN-03.md) — Implement per-type grading and human rubric review
5. [LRN-04](tasks/LRN-04.md) — Serialize assignment attempts and assessment submission
6. [LRN-05](tasks/LRN-05.md) — Publish only exact reviewed immutable content revisions
7. [LRN-06](tasks/LRN-06.md) — Render every supported ordered lesson block
8. [LRN-08](tasks/LRN-08.md) — Contain incomplete boards and preserve block identity
9. [LRN-09](tasks/LRN-09.md) — Authorize previews per lesson
10. [LRN-10](tasks/LRN-10.md) — Resume attempts from server deadlines and saved answers
11. [LRN-11](tasks/LRN-11.md) — Handle already-expired assessment timer responses safely
12. [LRN-12](tasks/LRN-12.md) — Persist bounded watch progress and reliable completion
13. [ENH-10](tasks/ENH-10.md) — Deliver durable notifications and communication preferences
14. [LRN-13](tasks/LRN-13.md) — Send validated announcements to owned-course audiences
15. [LRN-14](tasks/LRN-14.md) — Use validated teacher-provided live meeting links
16. [LRN-15](tasks/LRN-15.md) — Repair catalog routing, search, filters and pagination
17. [LRN-16](tasks/LRN-16.md) — Complete Arabic/English interface and uploader-supplied locales
18. [ENH-04](tasks/ENH-04.md) — Import versioned assessments and assignments safely
19. [ENH-05](tasks/ENH-05.md) — Track content provenance, permissions and correction reports
20. [ENH-06](tasks/ENH-06.md) — Complete teacher/admin manual authoring from draft to publication
21. [ENH-07](tasks/ENH-07.md) — Present uploaded captions, transcripts and accessible lessons

### M3 — Paid release and operations

1. [COM-04](tasks/COM-04.md) — Disable simulated gateways and implement official adapters later
2. [COM-08](tasks/COM-08.md) — Make voucher redemption unique per student
3. [COM-12](tasks/COM-12.md) — Complete resumable manual checkout and receipt review
4. [ENG-10](tasks/ENG-10.md) — Bound queries, shared rate limits and sensitive logging
5. [ENG-11](tasks/ENG-11.md) — Add verification, password recovery and secure account changes
6. [ENH-16](tasks/ENH-16.md) — Provide support and operational privacy/retention workflows
7. [ENH-11](tasks/ENH-11.md) — Establish minor consent now and stage a guardian portal
8. [ENH-17](tasks/ENH-17.md) — Measure real educational, editorial and commercial outcomes

### M4 — Post-launch enhancements

1. [ENG-12](tasks/ENG-12.md) — Gate developer integrations and specify complete later enablement
2. [ENH-08](tasks/ENH-08.md) — Add entitled search, bookmarks and private student notes
3. [ENH-09](tasks/ENH-09.md) — Provide deterministic mastery and revision practice
4. [ENH-12](tasks/ENH-12.md) — Issue auditable certificates with privacy-safe verification
5. [ENH-13](tasks/ENH-13.md) — Offer rights-controlled expiring offline study packs
6. [ENH-14](tasks/ENH-14.md) — Implement scoped realtime collaborative whiteboards
7. [ENH-15](tasks/ENH-15.md) — Move untrusted code to a separate isolated executor

## Decisions and evidence required before real onboarding

- Operator verifies manual destination details, reconciliation/refund ownership and product durations; no hardcoded bank details or automatic payment simulation.
- Product owner and qualified local reviewers approve minor/guardian consent, privacy/retention periods and content-rights policy. Unknown historic consent/rights is not inferred.
- Owner resolves software license before public source distribution; the unsupported MIT claim is withdrawn and current source metadata is private/UNLICENSED.
- Operations supplies production private storage, verified email, isolated database/queue, monitored backups and named incident/support owners.
- Exact application/content revisions, migration IDs, test evidence and disabled-feature matrix are recorded in [release gates](TESTING_RELEASE_GATES.md).
