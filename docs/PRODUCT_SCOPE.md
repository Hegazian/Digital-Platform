# Product goal and scope

Specification version: **1.1, 22 October 2026**. The agreed 21 October product direction is unchanged. M0 internal engineering/G0 is finalized at application checkpoint **34723cd**; [current status](CURRENT_STATUS.md) records latest verification and remaining production holds. G1–G3 remain open. The [next implementation plan](NEXT_STEPS.md) continues ENG-09, ENG-05/ENG-06 operational evidence and all 25 M1 tasks. This document supersedes prior AI-production, narrow-track and parity-led requirements. The [historical audit](../audit/PRODUCT_READINESS_REVIEW.md) remains evidence about the prototype, not the current product mission.

## Mission

> A bilingual educational platform for Egyptian students across all school stages. Admins and approved teachers provide educational content through uploads, imports, and manual editors. The platform organizes, reviews, publishes, protects, and presents that content, manages assessments and student progress, and controls enrollment and paid access.

The platform is responsible for content management and presentation. Uploaders are responsible for supplying teaching material, translations, video/audio, captions, transcripts, questions, answer keys, rubrics, source metadata and permission evidence. Content accuracy and publication decisions are human editorial responsibilities.

## Audiences and academic coverage

Students browse configured stages, grades, tracks, years, terms, subjects, units and learning outcomes. The academic registry supports primary, preparatory, secondary and additional Egyptian school structures through admin configuration. No code path may assume that two career choices, one grade or Scientific Math represents the entire product. A pilot may supply a deliberately limited set of real courses while the model supports the full registry; unavailable content must be stated honestly.

Approved teachers create and maintain owned or explicitly assigned course drafts. Admins manage academic structures, teacher approval, assignment of editors/reviewers, content review/publication, access products, payment verification, support and operations. Students manage only their own learning records, submissions, notes, receipts and permitted communications.

“User-uploaded educational content” means admin/approved-teacher supplied teaching content. Student assignment files, payment receipts and support attachments are separate purpose-limited upload types; they do not grant students teaching-publication privileges.

## Permissions and responsibilities

| Actor | Allowed | Restrictions |
|---|---|---|
| Guest | Public catalog metadata and explicitly eligible published previews | No paid/private content, answer keys, graded attempt, private discussions or raw-file access |
| Student | Effective enrolled learning, own attempts/submissions/progress and account operations | No cross-account work, teacher authoring or answer-bank access |
| Pending/rejected teacher | Public browsing and defined approval/support flow | No ordinary authenticated platform session until approved |
| Approved teacher | Own/assigned drafts, assets, banks, assessments, assignments and assigned grading; submit review | No other teacher's keys/work; no self-approval of teacher submissions or subsequent revisions |
| Admin | Manage all content/users/settings and approve teacher revisions; publish own valid content | Must still pass completeness, rights, locale, asset and audit gates; no unsafe feature bypass |
| Guardian (staged) | Only verified child-linked, explicitly permitted summaries | Portal disabled at launch; no shared credentials, private notes or blanket course/admin privilege |
| Worker/system | Scoped processing or delivery operation named by durable job | No interactive identity impersonation; no public client service-role key |

Every request has an **actor** (person performing it), a **content owner**, and possibly an explicit assignment. These are separate fields. Request bodies cannot choose an actor. Admin editing a teacher's draft records the admin as actor and keeps the chosen owner.

## Language rules

The entire launch interface supports **Arabic and English**: account/recovery, catalog, checkout, learning, assessment, assignments, results, teacher/admin tools and errors. Arabic is the default interface; locale URLs `/ar` and `/en` determine server-rendered `html.lang` and `html.dir`. Currency/dates use locale-aware formatting with EGP and Africa/Cairo rules where appropriate.

Courses declare `contentLanguage=AR|EN|BILINGUAL` and a supplied primary locale. A monolingual course is allowed and labeled. Interface translation does not imply a translated teaching body. BILINGUAL publication requires the uploader to supply both required variants and corresponding tracks/materials according to block policy. Missing text is a review issue, never an automatic translation job. Equations, numbers, code and mixed-direction content need explicit accessible presentation.

## Content and assessment lifecycle

Canonical curriculum is **Course → Module/Unit → Lesson → ordered typed blocks**. Supported launch blocks are uploaded video/audio presentation where available, sanitized text, documents, safe links, assessments, assignments and validated existing live-session links. Unsupported advanced blocks show an honest staged state and cannot execute hidden endpoints.

Teacher work moves through editable draft, submission of an exact immutable revision, admin review, approval and atomic publication. Editing published content creates a new draft; students retain the prior approved published revision until the replacement is approved. All publication paths enforce the same completeness check. Admin-owned content may publish directly with actual actor and validation evidence. Review history and published snapshots are immutable.

Assessments use versioned definitions and frozen attempts, server deadlines, explicit per-question grading and human rubric review for essays. Legacy quiz URLs and historical scores survive migration. Assignment deadlines, limits, files, reviewer ownership and feedback must remain auditable. A missing original legacy question snapshot is marked unknown; no fabricated historical regrading.

Archival removes discovery and new sales. Existing valid purchases retain access to their retained approved content until expiry. Explicit **retraction** blocks student access, with a reason, communication and operational follow-up. Retraction is different from a teacher preparing a replacement draft.

## Launch commercial scope

- Free enrollment is explicit and governed by the same access policy as paid grants.
- Currency charged is **EGP**, using integer piastres; products require explicit access duration and immutable order snapshots.
- Verified manual transfers/offline payments remain pending until an admin verifies actual settlement. A receipt alone is insufficient proof.
- Vouchers have controlled validity/capacity and atomic one-per-student redemption.
- Payment history, refunds/reversals and paid-but-unfulfilled recovery are durable and auditable.
- Paymob and Fawry APIs are disabled at launch. Each needs its official merchant API/version, real sandbox evidence and independent M4 enablement. Simulated signatures/checkouts are not real integrations.

## Allowed file processing

File validation, signature/type checks, malware scanning, metadata probing, transcoding supplied media, rendition packaging, deterministic format conversion and thumbnail extraction are allowed. Uploaded captions may be converted between supported file formats without changing their words. All teaching files stay privately stored and referenced through managed asset IDs with authorized delivery.

The platform does **not** create educational text, questions, answers, rubrics, translations, narration, captions or teaching video. It has no AI tutor, model provider integration, model cost pipeline, prompt pipeline or automatic source-to-course generation requirement. Remove existing tutor endpoints/UI/SDK/config/fallback under [SCOPE-02](archive/completed/M0/SCOPE-02.md). Historical descriptions of these features are preserved as withdrawn recommendations.

## Launch completeness and exclusions

Launch includes human authoring/imports, exact revision review, private accessible content, reliable assessments/assignments/progress, full interface locales, free/manual/voucher access, account recovery, content-error reporting, support, consent/retention operations, monitoring, migrations and recovery. It requires actual operational evidence, not the existence of UI controls.

Searchable public catalog is launch work; full entitled-content search/bookmarks/notes and deterministic mastery are separately planned enhancements. Automated gateways, guardian portal, certificates, offline packs, realtime boards, isolated execution and developer token/webhook delivery are post-launch and server-disabled until their task gates pass. Required minor-consent onboarding and support/privacy controls are launch work even though the guardian portal is later.

No broad microservice rewrite, multi-tenant SaaS, separate native app, accreditation claim or automatic Zoom provisioning is a prerequisite. Retain existing authentication and modular monolith. Private Supabase production storage does not introduce Supabase Auth. A new framework version must be selected through supported-version/advisory verification during ENG-13, not assumed from a stale roadmap.

## Product decisions that require named owner evidence

Product/qualified local review must approve minor-consent requirements, data purposes/retention, rights to uploaded curriculum, refund terms and privacy notices before a real-minor pilot. Engineering must implement those reviewed policies rather than guess law. Operator verifies actual manual payment destinations. License owner must choose and document the repository's distribution license before public source distribution; no MIT claim is made from an absent file or conflicting package metadata.

See [roadmap](ROADMAP_BACKLOG.md), [contracts](API_DATA_CONTRACTS.md), [testing gates](TESTING_RELEASE_GATES.md) and [operations](MIGRATION_OPERATIONS.md) for implementation ownership and release evidence.
