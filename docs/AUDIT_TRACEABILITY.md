# Audit and acceptance traceability

Audit baseline **2fbdc8e**, 21 October 2026. Current disposition refreshed **22 October** against **d9c720f**; see [current status](CURRENT_STATUS.md) and [next steps](NEXT_STEPS.md). The [original review](../audit/PRODUCT_READINESS_REVIEW.md) and [test gap matrix](../audit/TEST_GAP_MATRIX.md) remain historical evidence. Their AI-production recommendations and AI-dependent release gates are **withdrawn**, not open defects under the revised mission. No production exploit or unrun integration success is inferred.

## Finding disposition — 58 of 58

Every finding keeps its original ID in exactly one file, has a release milestone/dependencies, and has task-specific test IDs. R/S/C/G evidence labels retain their original meaning. A conditional finding remains conditional until real-environment verification.

| Finding | Owning task / title | Milestone | Status | Acceptance / disposition |
|---|---|---|---|---|
| SEC-01 | [SEC-01](tasks/SEC-01.md) — Replace known privileged seeds with safe provisioning | M0 | Complete | [A06](#a06); required before assigned milestone exit. Tests SEC-01-T01 onward and T90–T92. |
| SEC-02 | [SEC-02](tasks/SEC-02.md) — Close raw-file bypasses with authorized private delivery | M0 | Complete | [A02](#a02), [A22](#a22); required before assigned milestone exit. Tests SEC-02-T01 onward and T90–T92. |
| SEC-03 | [SEC-03](tasks/SEC-03.md) — Reject disguised active content and quarantine uploads | M0 | Complete | [A03](#a03); required before assigned milestone exit. Tests SEC-03-T01 onward and T90–T92. |
| SEC-04 | [SEC-04](tasks/SEC-04.md) — Separate public catalog DTOs from protected learning DTOs | M0 | Complete | [A04](#a04); required before assigned milestone exit. Tests SEC-04-T01 onward and T90–T92. |
| SEC-05 | [SEC-05](tasks/SEC-05.md) — Eliminate answer-key leaks through explicit question DTOs | M0 | Complete | [A05](#a05); required before assigned milestone exit. Tests SEC-05-T01 onward and T90–T92. |
| SEC-06 | [SEC-06](tasks/SEC-06.md) — Enforce public, unlisted and private visibility consistently | M1 | Planned | [A04](#a04), [A12](#a12); required before assigned milestone exit. Tests SEC-06-T01 onward and T90–T92. |
| SEC-07 | [SEC-07](tasks/SEC-07.md) — Scope quiz and question-bank privileges to owners and assignments | M1 | Planned | [A05](#a05); required before assigned milestone exit. Tests SEC-07-T01 onward and T90–T92. |
| SEC-08 | [SEC-08](tasks/SEC-08.md) — Use safe assessment result and expiry responses | M0 | Complete | [A05](#a05); required before assigned milestone exit. Tests SEC-08-T01 onward and T90–T92. |
| SEC-09 | [SEC-09](tasks/SEC-09.md) — Bind teacher actions to the authenticated actor | M0 | Complete | [A07](#a07); required before assigned milestone exit. Tests SEC-09-T01 onward and T90–T92. |
| SEC-10 | [SEC-10](tasks/SEC-10.md) — Revoke authorization on every security-sensitive account change | M0 | Complete | [A08](#a08); required before assigned milestone exit. Tests SEC-10-T01 onward and T90–T92. |
| SEC-11 | [SEC-11](tasks/SEC-11.md) — Apply a consistent pending and rejected teacher policy | M0 | Complete | [A09](#a09); required before assigned milestone exit. Tests SEC-11-T01 onward and T90–T92. |
| SEC-12 | [SEC-12](tasks/SEC-12.md) — Apply learning access to discussions, assignments and banks | M1 | Planned | [A11](#a11), [A27](#a27); required before assigned milestone exit. Tests SEC-12-T01 onward and T90–T92. |
| SEC-13 | [SEC-13](tasks/SEC-13.md) — Consume refresh tokens atomically and define tab-race handling | M1 | Planned | [A10](#a10), [A33](#a33); required before assigned milestone exit. Tests SEC-13-T01 onward and T90–T92. |
| SEC-14 | [SEC-14](tasks/SEC-14.md) — Complete secure MFA enrollment and recovery | M1 | Planned | [A10](#a10); required before assigned milestone exit. Tests SEC-14-T01 onward and T90–T92. |
| SEC-15 | [SEC-15](tasks/SEC-15.md) — Keep unisolated code execution unavailable at launch | M0 | Complete | [A40](#a40); launch containment; separate M4 owner. Tests SEC-15-T01 onward and T90–T92. |
| COM-01 | [COM-01](tasks/COM-01.md) — Unify access decisions across all learning surfaces | M1 | Planned | [A11](#a11); required before assigned milestone exit. Tests COM-01-T01 onward and T90–T92. |
| COM-02 | [COM-02](tasks/COM-02.md) — Allow renewal after effective subscription expiry | M1 | Planned | [A12](#a12); required before assigned milestone exit. Tests COM-02-T01 onward and T90–T92. |
| COM-03 | [COM-03](tasks/COM-03.md) — Define calendar durations and atomic subscription review | M1 | Planned | [A13](#a13); required before assigned milestone exit. Tests COM-03-T01 onward and T90–T92. |
| COM-04 | [COM-04](tasks/COM-04.md) — Disable simulated gateways and implement official adapters later | M3 | Planned | [A14](#a14), [A15](#a15); launch disabled; providers M4. Tests COM-04-T01 onward and T90–T92. |
| COM-05 | [COM-05](tasks/COM-05.md) — Scope checkout idempotency by actor and payload | M1 | Planned | [A16](#a16); required before assigned milestone exit. Tests COM-05-T01 onward and T90–T92. |
| COM-06 | [COM-06](tasks/COM-06.md) — Make payment transitions auditable and fulfillment recoverable | M1 | Planned | [A15](#a15), [A18](#a18); required before assigned milestone exit. Tests COM-06-T01 onward and T90–T92. |
| COM-07 | [COM-07](tasks/COM-07.md) — Validate products and snapshot explicit access durations | M1 | Planned | [A13](#a13), [A18](#a18); required before assigned milestone exit. Tests COM-07-T01 onward and T90–T92. |
| COM-08 | [COM-08](tasks/COM-08.md) — Make voucher redemption unique per student | M3 | Planned | [A17](#a17); required before assigned milestone exit. Tests COM-08-T01 onward and T90–T92. |
| COM-09 | [COM-09](tasks/COM-09.md) — Define effective dates, archival and retraction semantics | M1 | Planned | [A12](#a12); required before assigned milestone exit. Tests COM-09-T01 onward and T90–T92. |
| COM-10 | [COM-10](tasks/COM-10.md) — Use effective audiences and real ledger metrics | M2 | Planned | [A11](#a11), [A30](#a30); required before assigned milestone exit. Tests COM-10-T01 onward and T90–T92. |
| COM-11 | [COM-11](tasks/COM-11.md) — Make course pricing atomic and preserve purchase history | M1 | Planned | [A15](#a15); required before assigned milestone exit. Tests COM-11-T01 onward and T90–T92. |
| COM-12 | [COM-12](tasks/COM-12.md) — Complete resumable manual checkout and receipt review | M3 | Planned | [A16](#a16), [A18](#a18); required before assigned milestone exit. Tests COM-12-T01 onward and T90–T92. |
| LRN-01 | [LRN-01](tasks/LRN-01.md) — Persist expiry before returning a quiz error | M2 | Planned | [A23](#a23); required before assigned milestone exit. Tests LRN-01-T01 onward and T90–T92. |
| LRN-02 | [LRN-02](tasks/LRN-02.md) — Unify versioned assessment definitions and frozen attempts | M2 | Planned | [A25](#a25); required before assigned milestone exit. Tests LRN-02-T01 onward and T90–T92. |
| LRN-03 | [LRN-03](tasks/LRN-03.md) — Implement per-type grading and human rubric review | M2 | Planned | [A05](#a05), [A26](#a26); required before assigned milestone exit. Tests LRN-03-T01 onward and T90–T92. |
| LRN-04 | [LRN-04](tasks/LRN-04.md) — Serialize assignment attempts and assessment submission | M2 | Planned | [A23](#a23), [A25](#a25), [A27](#a27); required before assigned milestone exit. Tests LRN-04-T01 onward and T90–T92. |
| LRN-05 | [LRN-05](tasks/LRN-05.md) — Publish only exact reviewed immutable content revisions | M2 | Planned | [A19](#a19), [A35](#a35); required before assigned milestone exit. Tests LRN-05-T01 onward and T90–T92. |
| LRN-06 | [LRN-06](tasks/LRN-06.md) — Render every supported ordered lesson block | M2 | Planned | [A20](#a20); required before assigned milestone exit. Tests LRN-06-T01 onward and T90–T92. |
| LRN-07 | [LRN-07](tasks/LRN-07.md) — Migrate sections to one canonical module hierarchy | M1 | Planned | [A21](#a21); required before assigned milestone exit. Tests LRN-07-T01 onward and T90–T92. |
| LRN-08 | [LRN-08](tasks/LRN-08.md) — Contain incomplete boards and preserve block identity | M2 | Planned | [A20](#a20); launch containment; separate M4 owner. Tests LRN-08-T01 onward and T90–T92. |
| LRN-09 | [LRN-09](tasks/LRN-09.md) — Authorize previews per lesson | M2 | Planned | [A22](#a22); required before assigned milestone exit. Tests LRN-09-T01 onward and T90–T92. |
| LRN-10 | [LRN-10](tasks/LRN-10.md) — Resume attempts from server deadlines and saved answers | M2 | Planned | [A24](#a24); required before assigned milestone exit. Tests LRN-10-T01 onward and T90–T92. |
| LRN-11 | [LRN-11](tasks/LRN-11.md) — Handle already-expired assessment timer responses safely | M2 | Planned | [A24](#a24); required before assigned milestone exit. Tests LRN-11-T01 onward and T90–T92. |
| LRN-12 | [LRN-12](tasks/LRN-12.md) — Persist bounded watch progress and reliable completion | M2 | Planned | [A28](#a28); required before assigned milestone exit. Tests LRN-12-T01 onward and T90–T92. |
| LRN-13 | [LRN-13](tasks/LRN-13.md) — Send validated announcements to owned-course audiences | M2 | Planned | [A07](#a07), [A30](#a30); required before assigned milestone exit. Tests LRN-13-T01 onward and T90–T92. |
| LRN-14 | [LRN-14](tasks/LRN-14.md) — Use validated teacher-provided live meeting links | M2 | Planned | [A07](#a07), [A31](#a31); required before assigned milestone exit. Tests LRN-14-T01 onward and T90–T92. |
| LRN-15 | [LRN-15](tasks/LRN-15.md) — Repair catalog routing, search, filters and pagination | M2 | Planned | [A41](#a41); required before assigned milestone exit. Tests LRN-15-T01 onward and T90–T92. |
| LRN-16 | [LRN-16](tasks/LRN-16.md) — Complete Arabic/English interface and uploader-supplied locales | M2 | Planned | [A32](#a32), [A42](#a42); required before assigned milestone exit. Tests LRN-16-T01 onward and T90–T92. |
| ENG-01 | [ENG-01](tasks/ENG-01.md) — Repair the Zod 4 build blocker and nested config schema | M0 | Complete | [A01](#a01); required before assigned milestone exit. Tests ENG-01-T01 onward and T90–T92. |
| ENG-02 | [ENG-02](tasks/ENG-02.md) — Make config updates persist and keep EGP charge semantics | M1 | Planned | [A18](#a18); required before assigned milestone exit. Tests ENG-02-T01 onward and T90–T92. |
| ENG-03 | [ENG-03](tasks/ENG-03.md) — Enforce server capability controls for staged features | M0 | Complete | [A14](#a14); required before assigned milestone exit. Tests ENG-03-T01 onward and T90–T92. |
| ENG-04 | [ENG-04](tasks/ENG-04.md) — Validate every request boundary with shared schemas | M1 | Planned | [A04](#a04); required before assigned milestone exit. Tests ENG-04-T01 onward and T90–T92. |
| ENG-05 | [ENG-05](tasks/ENG-05.md) — Introduce versioned migrations and upgrade verification | M1 | In Progress | [A01](#a01), [A39](#a39); required before assigned milestone exit. Tests ENG-05-T01 onward and T90–T92. |
| ENG-06 | [ENG-06](tasks/ENG-06.md) — Make readiness, shutdown and storage outages honest | M1 | In Progress | [A38](#a38); required before assigned milestone exit. Tests ENG-06-T01 onward and T90–T92. |
| ENG-07 | [ENG-07](tasks/ENG-07.md) — Persist actual audit actors and durable outbox events | M1 | Planned | [A38](#a38); required before assigned milestone exit. Tests ENG-07-T01 onward and T90–T92. |
| ENG-08 | [ENG-08](tasks/ENG-08.md) — Make public reads side-effect free and reference keys unique | M1 | Planned | [A38](#a38); required before assigned milestone exit. Tests ENG-08-T01 onward and T90–T92. |
| ENG-09 | [ENG-09](tasks/ENG-09.md) — Bound existing media handling and stream ranges correctly | M1 | In Progress | [A29](#a29); required before assigned milestone exit. Tests ENG-09-T01 onward and T90–T92. |
| ENG-10 | [ENG-10](tasks/ENG-10.md) — Bound queries, shared rate limits and sensitive logging | M3 | Planned | [A04](#a04), [A38](#a38); required before assigned milestone exit. Tests ENG-10-T01 onward and T90–T92. |
| ENG-11 | [ENG-11](tasks/ENG-11.md) — Add verification, password recovery and secure account changes | M3 | Planned | [A33](#a33); recovery launch; guardian portal ENH-11 M4. Tests ENG-11-T01 onward and T90–T92. |
| ENG-12 | [ENG-12](tasks/ENG-12.md) — Gate developer integrations and specify complete later enablement | M4 | Planned | [A40](#a40); API disabled by ENG-03; implementation M4. Tests ENG-12-T01 onward and T90–T92. |
| ENG-13 | [ENG-13](tasks/ENG-13.md) — Build trustworthy isolated tests and production CI gates | M0 | In Progress | [A01](#a01), [A40](#a40); required before assigned milestone exit. Tests ENG-13-T01 onward and T90–T92. |
| ENG-14 | [ENG-14](tasks/ENG-14.md) — Recover client sessions without discarding retryable failures | M1 | Planned | [A08](#a08), [A10](#a10), [A33](#a33); required before assigned milestone exit. Tests ENG-14-T01 onward and T90–T92. |
| ENG-15 | [ENG-15](tasks/ENG-15.md) — Align capability claims, runbooks and software-license status | M0 | Complete | [A36](#a36); claims corrected; license owner decision recorded. Tests ENG-15-T01 onward and T90–T92. |

## Original acceptance cases — 42 of 42

The legacy wording below is quoted solely to preserve lineage. Only **current criterion** is normative. “Revised” retains the intent with updated uploader/access/launch rules; “Superseded” withdraws the former AI requirement and provides removal checks. Each task has additional detailed test scenarios; ENH task tests cover new capabilities beyond these 42 inherited cases.

### A01

- Disposition: **Retained**. Gate: **G0**.
- Historical criterion (superseded wording where changed): A clean clone installs from both lockfiles, generates Prisma, typechecks and produces production builds using the documented supported Node version.
- **Current criterion:** Clean lockfile install, Prisma generation, supported runtime typechecks and both production builds pass.
- Implementation/test owners: [ENG-01](tasks/ENG-01.md), [ENG-05](tasks/ENG-05.md), [ENG-13](tasks/ENG-13.md), [ENH-02](tasks/ENH-02.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A02

- Disposition: **Revised**. Gate: **G0/G1**.
- Historical criterion (superseded wording where changed): Anonymous GET of a video, paid material, or student submission path returns 401/403/404; entitled/authorized grants work without making a raw public alias available.
- **Current criterion:** Raw local/cloud private paths deny access; authorized short-lived grants/proxy work for lessons, own submissions and receipts. Offline packs remain M4 and rights-gated.
- Implementation/test owners: [SEC-02](tasks/SEC-02.md), [ENH-03](tasks/ENH-03.md), [ENH-13](tasks/ENH-13.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A03

- Disposition: **Retained**. Gate: **G0/G1**.
- Historical criterion (superseded wording where changed): `.html`, `.js`, polyglot and invalid-signature content labeled PDF is rejected or quarantined and cannot execute on the application origin.
- **Current criterion:** Disguised HTML/JS, invalid signatures and unsafe polyglots are rejected/quarantined and cannot execute on the application origin.
- Implementation/test owners: [SEC-03](tasks/SEC-03.md), [ENH-03](tasks/ENH-03.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A04

- Disposition: **Revised**. Gate: **G0/G1**.
- Historical criterion (superseded wording where changed): Public course/list/section responses contain only approved catalog/preview metadata and never protected text, raw private paths, answer keys or block secrets.
- **Current criterion:** All public catalog/section/collection responses use allowlisted metadata; no paid body, object key, block secret or private visibility leakage.
- Implementation/test owners: [SEC-04](tasks/SEC-04.md), [SEC-06](tasks/SEC-06.md), [ENG-04](tasks/ENG-04.md), [ENG-10](tasks/ENG-10.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A05

- Disposition: **Retained**. Gate: **G0/G2**.
- Historical criterion (superseded wording where changed): Every question type is recursively checked for answer-key leakage across public, student, unrelated teacher, owner and administrator endpoints, including expired/submitted results.
- **Current criterion:** Every question type is checked recursively for key/snapshot leaks on public/student/unrelated-teacher and terminal attempt paths; owner/reviewer access is explicit.
- Implementation/test owners: [SEC-05](tasks/SEC-05.md), [SEC-07](tasks/SEC-07.md), [SEC-08](tasks/SEC-08.md), [LRN-03](tasks/LRN-03.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A06

- Disposition: **Retained**. Gate: **G0**.
- Historical criterion (superseded wording where changed): Seed/provisioning cannot install or reset known privileged credentials in a production environment.
- **Current criterion:** Production reference seed cannot create/reset known privileged credentials; one-time provisioning and deployed-credential remediation are evidenced.
- Implementation/test owners: [SEC-01](tasks/SEC-01.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A07

- Disposition: **Retained**. Gate: **G0/G2**.
- Historical criterion (superseded wording where changed): Teacher A cannot impersonate teacher B through body fields on announcements or live creation; authenticated identity is immutable.
- **Current criterion:** Authenticated actor cannot be overridden on announcement/live mutations; owner and acting editor are recorded separately.
- Implementation/test owners: [SEC-09](tasks/SEC-09.md), [LRN-13](tasks/LRN-13.md), [LRN-14](tasks/LRN-14.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A08

- Disposition: **Retained**. Gate: **G0/G1**.
- Historical criterion (superseded wording where changed): Demotion, password reset, deactivation and approval rejection revoke protected access consistently through every admin route and across API instances.
- **Current criterion:** Every security-sensitive account mutation revokes stale authorization on the next request across API instances.
- Implementation/test owners: [SEC-10](tasks/SEC-10.md), [ENG-14](tasks/ENG-14.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A09

- Disposition: **Revised**. Gate: **G0**.
- Historical criterion (superseded wording where changed): Rejected teachers cannot bypass the agreed account policy through password login, refresh or MFA completion.
- **Current criterion:** PENDING/REJECTED teachers cannot obtain normal sessions through login, refresh or MFA; an appeal/status path does not grant platform privileges.
- Implementation/test owners: [SEC-11](tasks/SEC-11.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A10

- Disposition: **Revised**. Gate: **G1**.
- Historical criterion (superseded wording where changed): Many simultaneous uses of one refresh token produce the defined single successor/session result without opening multiple valid branches or unpredictably logging out unrelated sessions.
- **Current criterion:** Refresh has one successor, bounded 409 tab-race handling and family-scoped replay revocation; concurrent TOTP/recovery code accepts once.
- Implementation/test owners: [SEC-13](tasks/SEC-13.md), [SEC-14](tasks/SEC-14.md), [ENG-14](tasks/ENG-14.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A11

- Disposition: **Retained**. Gate: **G1/G2**.
- Historical criterion (superseded wording where changed): For subscriptions, course purchases, subject grants, bundles, vouchers and free enrollment, frontend access equals video/material/quiz/assignment/discussion access and teacher roster membership.
- **Current criterion:** Every grant source produces equivalent learning/media/assessment/assignment/discussion/download decisions and deduplicated effective audience.
- Implementation/test owners: [COM-01](tasks/COM-01.md), [COM-10](tasks/COM-10.md), [SEC-12](tasks/SEC-12.md), [ENH-10](tasks/ENH-10.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A12

- Disposition: **Revised**. Gate: **G1**.
- Historical criterion (superseded wording where changed): Expired, revoked and future-dated access is handled consistently at exact date boundaries; renewal works for an expired row whose stored status remains ACTIVE.
- **Current criterion:** Future/expired/revoked grants obey exact interval boundaries; renewal ignores stale ACTIVE labels; archive retains prior access and retraction blocks delivery.
- Implementation/test owners: [COM-02](tasks/COM-02.md), [COM-09](tasks/COM-09.md), [SEC-06](tasks/SEC-06.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A13

- Disposition: **Revised**. Gate: **G1**.
- Historical criterion (superseded wording where changed): January 31 monthly billing, leap years, Cairo timezone display and DST transitions use documented, consistent rules.
- **Current criterion:** Clamped calendar terms and explicit durations obey documented Cairo gap/overlap rules; original purchased history is not silently recalculated.
- Implementation/test owners: [COM-03](tasks/COM-03.md), [COM-07](tasks/COM-07.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A14

- Disposition: **Revised — staged**. Gate: **G3 disabled; G4 enablement**.
- Historical criterion (superseded wording where changed): A gateway sandbox checkout settles once using official signatures and payloads; wrong merchant, currency, amount, terminal state and order mapping fail closed.
- **Current criterion:** Launch provider APIs fail FEATURE_DISABLED. M4 each provider independently passes official sandbox checkout/callback/refund/reconciliation fixtures before enablement.
- Implementation/test owners: [COM-04](tasks/COM-04.md), [ENG-03](tasks/ENG-03.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A15

- Disposition: **Revised**. Gate: **G1/G3; provider G4**.
- Historical criterion (superseded wording where changed): One provider transaction cannot fulfill multiple orders; duplicate callbacks/admin approvals grant access once; refund/cancellation cannot be overwritten by an old paid callback.
- **Current criterion:** Manual decisions and later verified callbacks dedupe payment/grant effects, retain ledger history and reject stale payment after cancellation/refund.
- Implementation/test owners: [COM-06](tasks/COM-06.md), [COM-04](tasks/COM-04.md), [COM-11](tasks/COM-11.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A16

- Disposition: **Retained**. Gate: **G1/G3**.
- Historical criterion (superseded wording where changed): An idempotency key cannot reveal another user's order, change request identity, or create duplicates during concurrent first calls.
- **Current criterion:** Actor/operation/key and payload hash prevent disclosure, changed-intent reuse and duplicate concurrent checkout creation.
- Implementation/test owners: [COM-05](tasks/COM-05.md), [COM-12](tasks/COM-12.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A17

- Disposition: **Retained**. Gate: **G3**.
- Historical criterion (superseded wording where changed): Concurrent redemption by the same student consumes one voucher use and grants the intended access once; global use limits and failure rollback still hold.
- **Current criterion:** Same-student voucher race consumes one use/grant; global caps and rollback remain correct under real database concurrency.
- Implementation/test owners: [COM-08](tasks/COM-08.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A18

- Disposition: **Revised**. Gate: **G1/G3**.
- Historical criterion (superseded wording where changed): Invalid resource products cannot be sold; successful paid orders receive the advertised duration and usable access; fulfillment errors are operationally visible and recoverable.
- **Current criterion:** Valid EGP resource/duration snapshots produce usable access; paid-but-unfulfilled states are durable, visible and recoverable.
- Implementation/test owners: [COM-07](tasks/COM-07.md), [COM-06](tasks/COM-06.md), [COM-12](tasks/COM-12.md), [ENG-02](tasks/ENG-02.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A19

- Disposition: **Retained**. Gate: **G2**.
- Historical criterion (superseded wording where changed): Editing published content creates a separately reviewable revision; the student retains the published version until the reviewed revision is atomically released.
- **Current criterion:** Teacher changes create drafts; only exact reviewed immutable revisions publish; admin-owned publication still runs completeness.
- Implementation/test owners: [LRN-05](tasks/LRN-05.md), [ENH-06](tasks/ENH-06.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A20

- Disposition: **Revised**. Gate: **G2; advanced G4**.
- Historical criterion (superseded wording where changed): Content created through teacher UI is consumable in student UI for every supported video/text/PDF/link/quiz/assignment/live/board type, in the authored order.
- **Current criterion:** Every launch-supported uploaded/edited block renders in order; board/code blocks show honest server-disabled state until their separate M4 gates pass.
- Implementation/test owners: [LRN-06](tasks/LRN-06.md), [ENH-06](tasks/ENH-06.md), [LRN-08](tasks/LRN-08.md), [ENH-14](tasks/ENH-14.md), [ENH-15](tasks/ENH-15.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A21

- Disposition: **Retained**. Gate: **G1**.
- Historical criterion (superseded wording where changed): No lesson has zero/two conflicting parents. Existing mixed module/section data migrates without losing lessons or double-counting progress.
- **Current criterion:** Canonical module migration loses no lesson ID, order, preview or progress; database forbids orphan/conflicting cross-course parents.
- Implementation/test owners: [LRN-07](tasks/LRN-07.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A22

- Disposition: **Revised**. Gate: **G2**.
- Historical criterion (superseded wording where changed): Guest and signed-in unentitled students can use exactly the designated preview lessons and cannot use protected siblings.
- **Current criterion:** Explicit published previews are read-only per lesson for permitted audiences; siblings, files and write operations stay protected.
- Implementation/test owners: [LRN-09](tasks/LRN-09.md), [SEC-02](tasks/SEC-02.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A23

- Disposition: **Retained**. Gate: **G2**.
- Historical criterion (superseded wording where changed): Quiz expiry is persisted after a late submit/start; the expired attempt counts once, repeat submit is stable, and a next attempt can be started when allowed.
- **Current criterion:** Expiry persists after the HTTP error, counts once, repeats stably and permits a next attempt only within rules.
- Implementation/test owners: [LRN-01](tasks/LRN-01.md), [LRN-04](tasks/LRN-04.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A24

- Disposition: **Retained**. Gate: **G2**.
- Historical criterion (superseded wording where changed): Quiz/assessment reload resumes the same server deadline and restores saved answers. Switching lesson/quiz cannot preserve another attempt's answers, index or result.
- **Current criterion:** Reload uses same server deadline/saved answers; stale response or identity/quiz switch cannot leak state; expired first render is safe.
- Implementation/test owners: [LRN-10](tasks/LRN-10.md), [LRN-11](tasks/LRN-11.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A25

- Disposition: **Retained**. Gate: **G2**.
- Historical criterion (superseded wording where changed): Definition changes cannot alter in-flight or historical grading; due dates and max attempts are enforced under parallel submissions.
- **Current criterion:** Immutable versions freeze question identities/rules; due dates and max attempts hold under concurrent submissions.
- Implementation/test owners: [LRN-02](tasks/LRN-02.md), [LRN-04](tasks/LRN-04.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A26

- Disposition: **Revised**. Gate: **G2; enhancements G4**.
- Historical criterion (superseded wording where changed): Each supported question type has correct grading semantics. Essays remain pending until an authorized reviewer applies a rubric and produces a final auditable grade.
- **Current criterion:** Objective types use explicit policies, essays await human rubric review, pending work is excluded from final averages/mastery/certification.
- Implementation/test owners: [LRN-03](tasks/LRN-03.md), [ENH-09](tasks/ENH-09.md), [ENH-12](tasks/ENH-12.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A27

- Disposition: **Retained**. Gate: **G2**.
- Historical criterion (superseded wording where changed): Concurrent assignment submissions respect maxAttempts; late policy, file ownership, grader ownership, score bounds and feedback persist end to end.
- **Current criterion:** Assignment attempt/deadline/file/grader ownership and score bounds persist through concurrent HTTP/upload/browser flows.
- Implementation/test owners: [LRN-04](tasks/LRN-04.md), [SEC-12](tasks/SEC-12.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A28

- Disposition: **Retained**. Gate: **G2**.
- Historical criterion (superseded wording where changed): Video watch time and resume position survive refresh/device change; retries cannot inflate time and failed completion writes are not silently shown as synced.
- **Current criterion:** Bounded idempotent watch progress and resume survive refresh/device change; failed sync is visible and never equated with mastery.
- Implementation/test owners: [LRN-12](tasks/LRN-12.md), [ENH-09](tasks/ENH-09.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A29

- Disposition: **Revised**. Gate: **G1/G2**.
- Historical criterion (superseded wording where changed): Real supported video assets play/seek on target Android/iOS/desktop browsers; suffix/invalid ranges yield correct 206/416 responses without crashes or hangs.
- **Current criterion:** Uploaded supported source media is verified/processed privately, plays/seeks on target browsers and handles ranges/disconnects without crashes.
- Implementation/test owners: [ENG-09](tasks/ENG-09.md), [ENH-03](tasks/ENH-03.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A30

- Disposition: **Retained**. Gate: **G2**.
- Historical criterion (superseded wording where changed): Announcements choose an owned course and reach the correct deduplicated active audience once; partial delivery failures are retried.
- **Current criterion:** Owned-course announcements reach one effective deduplicated audience through durable delivery and bounded retry.
- Implementation/test owners: [LRN-13](tasks/LRN-13.md), [COM-10](tasks/COM-10.md), [ENH-10](tasks/ENH-10.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A31

- Disposition: **Revised**. Gate: **G2**.
- Historical criterion (superseded wording where changed): Live sessions create/open real meetings, display for all eligible subjects, respect start/end times and roles, and do not expose host links to students.
- **Current criterion:** Valid existing teacher-provided meeting URLs are stored and presented across all eligible subjects; no invented meetings or student host-link leaks.
- Implementation/test owners: [LRN-14](tasks/LRN-14.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A32

- Disposition: **Revised**. Gate: **G2/G3**.
- Historical criterion (superseded wording where changed): Arabic and English registration → catalog → checkout → lesson → quiz → assignment → results journeys contain the correct text, lang/dir, currency/date formatting and keyboard reading order after reload.
- **Current criterion:** Entire Arabic/English interface journey works after reload; courses declare supplied AR/EN/BILINGUAL content without requiring generated translations.
- Implementation/test owners: [LRN-16](tasks/LRN-16.md), [ENH-01](tasks/ENH-01.md), [ENH-06](tasks/ENH-06.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A33

- Disposition: **Retained**. Gate: **G1/G3**.
- Historical criterion (superseded wording where changed): Real API role/session cookies work behind the intended reverse proxy/custom domain; refresh, login redirects and logout behave across tabs.
- **Current criterion:** Real reverse-proxy cookies/login/refresh/profile/logout/recovery work across tabs with terminal versus retryable failures distinguished.
- Implementation/test owners: [SEC-13](tasks/SEC-13.md), [ENG-14](tasks/ENG-14.md), [ENG-11](tasks/ENG-11.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A34

- Disposition: **Revised — human upload**. Gate: **G2**.
- Historical criterion (superseded wording where changed): Source ingestion retains page-level evidence, edition/year/term/outcome metadata and permission records; low-confidence OCR does not auto-publish.
- **Current criterion:** Uploaded sources retain checksum, edition/year/term/outcome/page metadata and uploader permission declaration; no extraction/generation or automatic publication is required.
- Implementation/test owners: [ENH-01](tasks/ENH-01.md), [ENH-03](tasks/ENH-03.md), [ENH-05](tasks/ENH-05.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A35

- Disposition: **Revised — manual editing/import**. Gate: **G2**.
- Historical criterion (superseded wording where changed): AI produces schema-valid Arabic/English educational drafts with verified answers and source citations; educator acceptance is required before publication.
- **Current criterion:** Uploader-created Arabic/English text, keys and rubrics validate, preview and atomically import/edit as drafts; exact admin approval precedes teacher publication.
- Implementation/test owners: [ENH-04](tasks/ENH-04.md), [ENH-06](tasks/ENH-06.md), [LRN-05](tasks/LRN-05.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A36

- Disposition: **Superseded — AI withdrawn**. Gate: **G0; search G4**.
- Historical criterion (superseded wording where changed): Tutor retrieves only allowed content, resists source/prompt instruction injection, protects unreleased answer keys, handles unsupported questions, and respects per-user token/cost/time budgets.
- **Current criterion:** Tutor UI/routes/SDK/config/fallback are removed; legacy endpoint returns 410/404 and no provider request occurs. Entitled content search is a separate staged feature, not tutoring.
- Implementation/test owners: [SCOPE-01](tasks/SCOPE-01.md), [SCOPE-02](tasks/SCOPE-02.md), [ENG-15](tasks/ENG-15.md), [ENH-08](tasks/ENH-08.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A37

- Disposition: **Revised — uploaded media**. Gate: **G2**.
- Historical criterion (superseded wording where changed): Generated narration/video/captions match the reviewed script and render Arabic equations/diagrams/terminology correctly; corrections invalidate all affected derivatives.
- **Current criterion:** Uploaded source video/audio and uploader-provided captions/transcripts retain integrity and exact revision pairing; technical transcodes/thumbnails do not generate teaching material.
- Implementation/test owners: [ENH-03](tasks/ENH-03.md), [ENH-07](tasks/ENH-07.md), [ENH-05](tasks/ENH-05.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A38

- Disposition: **Revised**. Gate: **G1/G3**.
- Historical criterion (superseded wording where changed): DB/storage/model/payment outages produce correct unavailable/pending states; readiness fails, durable data survives restarts, and audit/notifications are not silently lost.
- **Current criterion:** DB/storage/queue/email/payment outages return correct pending/unavailable states, fail readiness appropriately and retain audit/delivery jobs; model/provider dependency is withdrawn.
- Implementation/test owners: [ENG-06](tasks/ENG-06.md), [ENG-07](tasks/ENG-07.md), [ENG-08](tasks/ENG-08.md), [ENG-10](tasks/ENG-10.md), [ENH-10](tasks/ENH-10.md), [ENH-16](tasks/ENH-16.md), [ENH-17](tasks/ENH-17.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A39

- Disposition: **Retained**. Gate: **G1/G3**.
- Historical criterion (superseded wording where changed): Migrations upgrade a representative previous database; backup/restore recovers purchases, permissions, student work, content versions and source provenance.
- **Current criterion:** Upgrade plus backup/restore preserves purchases, permissions, student work, immutable revisions and provenance; deletion ledger is respected after restore.
- Implementation/test owners: [ENG-05](tasks/ENG-05.md), [ENH-16](tasks/ENH-16.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A40

- Disposition: **Revised**. Gate: **G0/G3**.
- Historical criterion (superseded wording where changed): Production critical/high dependency exposure is resolved or explicitly triaged with deployment-specific evidence; CI prevents reintroduction and runs required browser journeys without skips.
- **Current criterion:** Dependency exposure is triaged/remediated for the release deployment; critical browser/concurrency/migration jobs have no skips; unsafe execution and incomplete integrations remain API-disabled.
- Implementation/test owners: [ENG-13](tasks/ENG-13.md), [SEC-15](tasks/SEC-15.md), [ENG-12](tasks/ENG-12.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A41

- Disposition: **Revised**. Gate: **G2; search G4**.
- Historical criterion (superseded wording where changed): Catalog search/filter/pagination finds known Arabic/English topics beyond the first 100 courses; career selection uses the supported endpoint and taxonomy.
- **Current criterion:** Configured stages/grades/terms and Arabic/English search/paging find known courses past 100; /careers is used only where relevant; entitled full-content search remains staged.
- Implementation/test owners: [LRN-15](tasks/LRN-15.md), [ENH-01](tasks/ENH-01.md), [ENH-08](tasks/ENH-08.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.

### A42

- Disposition: **Retained**. Gate: **G2/G3; advanced G4**.
- Historical criterion (superseded wording where changed): Keyboard, screen reader, reduced motion, contrast, captions, mobile touch, and slow/interrupted-network journeys pass with intended low-cost devices.
- **Current criterion:** Keyboard/screen-reader/contrast/captions/mobile/touch/slow-network flows pass; advanced features need equivalent evidence before M4 enablement.
- Implementation/test owners: [ENH-07](tasks/ENH-07.md), [LRN-16](tasks/LRN-16.md), [ENH-11](tasks/ENH-11.md), [ENH-13](tasks/ENH-13.md), [ENH-14](tasks/ENH-14.md). Use the owning task status, [M0 evidence](M0_IMPLEMENTATION_STATUS.md) and [shared protocol](TESTING_RELEASE_GATES.md#test-protocol). Broader gate acceptance is not inferred from a task checkpoint.


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
