# API and data contracts

Current private-media compatibility rule after the final M0 review: new upload object keys are scoped to the server-generated material/video ID (`lesson-materials/<materialId>/<file>` or `lesson-videos/<videoId>/<file>`). Arbitrary object keys, other buckets and unrelated IDs never establish delivery authority. Video attachment resolves a supplied internal reference to an existing owned upload; manual document attachments use public HTTPS only. External content is delivered without platform credentials. Legacy unscoped references retain their bytes but require verified re-upload under [the recovery procedure](MIGRATION_OPERATIONS.md#private-media-object-binding-after-the-final-m0-review). This transitional binding is not the future ENH-03 managed-asset library.

Refreshed **22 October 2026** against application checkpoint **34723cd**. See [current implementation and test evidence](CURRENT_STATUS.md) and [next steps](NEXT_STEPS.md). M0 adapters below exist; C01–C10 remain target contracts until their owning task supplies implementation and compatibility evidence. ENH-02 owns contract/schema migration after ENG-05; consumers must not independently change envelopes.

## Implemented M0 compatibility adapters

The normative asset-ID/revision/import contracts below remain the M1–M3 target. These protected adapters are implemented for existing resources while retaining their IDs/history:

- `GET /api/v1/materials/:id/content` and `GET /api/v1/assignments/submission-files/:id/content` require a current Bearer session and resource access. UI links/viewers fetch with the refresh-aware client, then create and later revoke a blob URL. They do not navigate directly to a Bearer-only endpoint. Active HTML/SVG/XML/JavaScript MIME types are rejected before a same-origin blob is exposed. Responses and signed redirects are private/no-store.
- `POST /api/v1/assignments/uploads` returns `{success:true,data:{fileUrl,uploadToken,fileName,sizeBytes,mimeType}}`. `fileUrl` is a private relative upload reference. The 24-hour signed token binds the uploader, exact path and server-supplied metadata. Submit `files:[{fileUrl,uploadToken,fileName,sizeBytes}]` to `POST /api/v1/assignments/:id/submit`. The schema and service share the path contract; the service verifies the token and persists its trusted metadata. A different student, expired/forged token or traversal path is rejected. Existing stored submissions are not rewritten or deleted.
- `GET /api/v1/videos/:id/playback-url` returns `{success:true,data:{playbackUrl,expiresAt}}`; grants last at most 120 seconds. The player renews about 30 seconds before expiry, preserving position, speed and pause state; stale lesson responses are ignored and renewal denial stops delivery. These grants do not contain a normal platform access token.
- `GET /api/v1/courses/:id` supplies catalog metadata to non-managers. An authorized session fetches `/:id/learning` for protected curriculum. Enrollment and verified-checkout callbacks reload that endpoint immediately. Role-dependent and protected responses are private/no-store.
- `GET /api/v1/config` also returns read-only `capabilities:{codeExecution:false,collaborativeBoards:false,developerIntegrations:false,automatedPaymentGateways:false}` from the server release policy. Config writes cannot enable them. Clients fail closed when the snapshot is absent; it controls presentation only. Direct staged APIs still return 503 `FEATURE_DISABLED` regardless of client state.
- The client renews protected `/auth/profile` and `/auth/me` requests on 401 through the existing refresh-cookie endpoint. Refresh 401/403 ends the session; 409/429/5xx and network/protocol failures preserve it for recovery. Credential/challenge/refresh/logout requests never recursively refresh. Request cancellation is propagated without an API warning; genuine HTTP/network failures stay visible. This compatibility repair does not claim the complete SEC-13 token-family/tab-race design.

These adapters retain the existing success envelope. ENH-02 owns migration to the shared target DTO/error conventions; M0 does not claim every proposed endpoint below already exists.

Version **1.1 — target contracts**, 22 October 2026. These are intended contracts to implement, not an assertion that the endpoints already exist. Preserve `/api/v1`, existing app identity and valid legacy IDs. New models/endpoints named here are proposed. Task examples are illustrative subsets; the shared rules and errors below take precedence. Security redactions are intentional breaking fixes and must not retain leaked fields for compatibility.

## Contract register

| Contract | Owner | Coverage |
|---|---|---|
| C01 | ENH-02; ENG-04 adopts | Envelopes, validation, identity, concurrency, errors and compatibility |
| C02 | SEC-04 / COM-01 | Catalog versus learning, ownership, visibility, lifecycle and access |
| C03 | ENH-03; SEC-02/03 immediate guards | Asset upload, finalize, processing, private delivery and cleanup |
| C04 | LRN-05 | Draft/review/publication actions and exact revision semantics |
| C05 | LRN-02 / LRN-03 / LRN-04 | Versioned assessment, frozen attempt, objective/human grading, assignments |
| C06 | ENH-04 | JSON/CSV preview, errors, atomic confirmation and draft import |
| C07 | COM-06 / COM-07 | EGP checkout, payment transitions, vouchers, reconciliation |
| C08 | ENH-01 / LRN-16 | Academic references, course content locales and translation rules |
| C09 | LRN-12 / ENH-09 | Progress, completion and deterministic staged mastery |
| C10 | ENG-07 / ENH-10 | Audit/outbox events, notification delivery, capabilities and privacy operations |

## C01 — common rules

Success responses are `{ "data": ... }`. Paginated collection responses add `page: {nextCursor: string|null, hasMore: boolean}`; do not add an unbounded total by default. Status 202 means a durable queued operation, not completed delivery/payment/processing.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "messageKey": "validation.invalid",
    "requestId": "req_example",
    "fields": [{"path": "questions.0.options", "code": "MIN_ITEMS"}]
  }
}
```

| HTTP | Code / rule |
|---|---|
| 400 | Invalid transport syntax; invalid JSON/CSV syntax with safe path/row context |
| 401 | UNAUTHENTICATED, SESSION_REVOKED or invalid credential; terminal auth only when confirmed |
| 403 | ACCESS_REQUIRED / ACCOUNT_NOT_APPROVED where resource existence is intentionally known |
| 404 | NOT_FOUND for absent or private unauthorized resource; no private title/owner leakage |
| 409 | STATE_CONFLICT, IDEMPOTENCY_CONFLICT, ANSWER_VERSION_CONFLICT, ATTEMPT_EXPIRED or REFRESH_ALREADY_ROTATED |
| 410 | CAPABILITY_REMOVED for temporary legacy AI tombstone; no prompt echo |
| 412 | VERSION_MISMATCH for failed If-Match/ETag |
| 413 / 415 | PAYLOAD_TOO_LARGE / UNSUPPORTED_MEDIA_TYPE |
| 416 | Unsatisfiable/unsupported range, with `Content-Range: bytes */<length>` |
| 422 | VALIDATION_ERROR, invalid relationship/bounds/unknown field |
| 429 | RATE_LIMITED with Retry-After |
| 503 | TEMPORARILY_UNAVAILABLE / FEATURE_DISABLED; not a successful empty/memory fallback |

`requestId` is also a response header. Error fields never contain passwords, keys, submitted teaching/answer text, signed capabilities or full receipts. Translate `messageKey` in interface catalogs; status/code remain stable across languages. Inputs are strict Zod schemas shared through proposed `packages/contracts`; outputs are explicit allowlists, not ORM spreads.

IDs use existing UUID/cuid formats after code inventory; examples such as `c_1` are explanatory only and not valid test fixtures. Arrays/strings are bounded per endpoint; reject unknown JSON fields and duplicate relationship IDs. Default page size 20, max 50 for public/user lists; admin export is a separate async operation. Instants are ISO-8601 UTC; require timezone offsets on input. Calendar subscription math uses Africa/Cairo with clamped day, earlier offset at overlap and next valid instant at a gap. Intervals are `[startsAt, endsAt)`.

All mutation services receive `actor` separately from validated input. `ownerId` may be changed only by an explicit admin transfer command; public bodies reject `actorId`, `createdById` and legacy `teacherId` overrides. Existing approved teacher may act only on owned/explicitly assigned content. Approval state and authVersion are current server state, not stale JWT role alone.

Retain JWT authentication, hashed refresh registry and httpOnly refresh cookie. Access token is memory-only after ENG-14 migration (remove legacy persisted access token); a script-readable token must not be required by storage. Cookie domain/Secure/SameSite/path and trusted proxy settings match the actual topology. Validate Origin/CSRF on cookie-authenticated state changes, restrict credentialed CORS to approved origins, and test logout/refresh behind HTTPS proxy and across tabs. Never log token-bearing query strings.

Draft edits use ETag/If-Match; scoped mutation retries use `Idempotency-Key`, maximum 128 opaque characters, plus canonical payload hash and actor/operation. Same scope/key/hash returns the same result; changed hash is 409. Idempotency data lives at least through the intent retry lifetime; terminal financial history is retained under policy. Conditional writes and uniqueness enforce concurrency; serializable operations retry at most three times with jitter before a safe retryable response. No unbounded retry for permissions/validation failures.

Refresh rotation: one successor per token. Losing concurrent tabs receive 409 `REFRESH_ALREADY_ROTATED` within a five-second immediate-race window, retry after shared-cookie coordination, and cannot create another branch. Reuse beyond this window revokes only that family. Exact database and browser tests must establish this policy; source inspection alone does not prove the original race reproduced.

## C02 — catalog, learning and access

```ts
type Locale = 'ar' | 'en';
type LocaleText = { ar?: string; en?: string }; // Required locales depend on course declaration.
type CatalogLesson = { id: string; title: LocaleText; position: number; isPreview: boolean };
type CatalogCourse = {
  id: string; title: LocaleText; summary: LocaleText;
  contentLanguage: 'AR'|'EN'|'BILINGUAL'; defaultContentLocale: Locale;
  academic: { curriculumEditionId: string; stageId: string; gradeId: string; termId: string; subjectId: string };
  coverAssetId: string|null; // Catalog-only approved rendition, separately authorized presentation.
  offer: { productId: string; priceMinor: number; currency: 'EGP'; duration: Duration }|null;
  modules: Array<{id:string; title:LocaleText; position:number; lessons:CatalogLesson[]}>;
};
type AccessDecision = {
  courseId: string; lessonId?: string; access: 'FULL'|'PREVIEW'|'NONE';
  source?: 'SUBSCRIPTION'|'PURCHASE'|'GRANT'|'VOUCHER'|'FREE_ENROLLMENT'|'PREVIEW';
  reason?: 'NOT_ENROLLED'|'EXPIRED'|'NOT_STARTED'|'REVOKED'|'RETRACTED';
  validUntil: string|null; capabilities: Array<'READ'|'ATTEMPT'|'SUBMIT'|'DISCUSS'|'DOWNLOAD'>;
};
```

`GET /courses` uses CatalogCourse summaries without the entire nested curriculum on each card; detail may include metadata-only modules/lessons. Never include lesson bodies, block configuration, answers, storage paths, live join/host links or private permissions in catalog. A cover rendition may be catalog-safe, but must be explicitly approved rather than making all original files public.

Legacy stored block enum adapters are explicit: `QUIZ -> ASSESSMENT`, `BOARD -> WHITEBOARD`, `CODE_PLAYGROUND -> CODE`; preserve block IDs/order while mapping. Do not create two interchangeable wire names or infer a board ID from its type. Uploaded podcast/audio presentation reuses managed asset/access/text-track contracts in its existing audio player; if exposed as a new AUDIO block, add a versioned registry/schema entry and editor-to-player tests before enabling it. Standalone audio metadata has an explicit public/catalog policy and protected episode delivery, not arbitrary external storage URLs.

`GET /learning/courses/:id/access` returns a server decision, not a boolean with client fallback. `GET /learning/lessons/:id` returns `{data:{id,courseId,revisionId,title,contentLocale,access,blocks}}` only after access. Blocks are discriminated by `type`/`schemaVersion` with stable ID, position, required and completionPolicy. `TEXT` holds sanitized supplied rich text, `DOCUMENT`/`VIDEO` use assetId, `LINK` uses bounded HTTPS URL without credentials, `ASSESSMENT` references assessmentVersionId, `ASSIGNMENT` assignmentVersionId, `LIVE_SESSION` sessionId. Actual delivery grants are requested separately. WHITEBOARD/CODE blocks return staged state while disabled, never runnable config disguised as a hidden control.

PUBLIC+published is list-discoverable. UNLISTED+published detail metadata works by link but is absent from lists/search/recommendations. PRIVATE metadata/learning requires explicit current membership or owner/admin studio rights. Collection membership cannot reveal a hidden course. A PUBLIC preview grants READ of only explicitly designated published lessons, not assessment submissions/posts/private siblings. PRIVATE does not become public from a preview bit.

Access policy checks current account, ownership where relevant, course lifecycle, startsAt/expiry/revocation and all valid sources (subscriptions, direct/subject/grade-bundle grants, voucher, free enrollment). Overlapping grants dedupe. No future grant before startsAt. ARCHIVED hides discovery/stops new sales, retains preexisting effective access to preserved published content. RETRACTED blocks student learning. Draft access is a distinct studio permission. Domain reads, media, attempts, assignments, discussion and audience queries must match this policy.

## C03 — managed assets

Data: `Asset(id, ownerId, createdById, purpose, state, originalKey, detectedType, bytes, sha256, version, failureCode)`, `AssetRendition`, `UploadSession`, `QuotaReservation`, `AssetAttachment`. Purpose enum covers LESSON_MEDIA, MATERIAL, CAPTION, TRANSCRIPT, SOURCE, RIGHTS_EVIDENCE, SUBMISSION, PAYMENT_RECEIPT and SUPPORT_ATTACHMENT. Educational purposes require approved editor/admin; student purposes require ownership of their target record. Every attachment verifies same owner/assignment and valid target.

Lifecycle:

```text
RESERVED -> UPLOADING -> QUARANTINED -> SCANNING -> PROCESSING -> READY
                  \-> CANCELLED/EXPIRED   \-> REJECTED/FAILED
READY -> RETIRED (no new attachment; preserve referenced published versions)
```

READY requires final server verification and successful processing. Quarantined or partially uploaded content never has a delivery grant. Processing uses job ID+asset version uniqueness; bounded retries max five then visible dead-letter. Finalize cannot promote READY on client assertion alone.

```json
{
  "purpose": "LESSON_MEDIA",
  "targetId": "draft_revision_id",
  "filename": "algebra.mp4",
  "contentType": "video/mp4",
  "bytes": 40000000,
  "sha256": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
}
```

`POST /assets/uploads` reserves quota and returns `{data:{assetId,uploadSessionId,protocol,endpoint,objectName,token,expiresAt,maxBytes}}`. `protocol=TUS` in production; local protected driver may return a streaming upload endpoint. Browser filename is display metadata only; keys are server-generated immutable random paths. Allowlist and purpose limits default to configured 1 GiB teaching video, 50 MiB material/submission, 10 MiB receipt and 5 MiB caption, with per-user/org storage/concurrency limits required in production. Values must be enforced again against actual stored size; vendor upload tokens do not replace application quota accounting.

Production integration uses Supabase TUS with its direct storage hostname, `tus-js-client`, vendor-required 6 MiB chunks and the token from server `createSignedUploadUrl` as `x-signature`. Our app JWT is not a Supabase Auth session; do not copy the vendor's session-login example. Use no upsert for immutable originals. Provider upload-URL lifetime may exceed an app session: track actual vendor expiry, reject expired app finalize, retain quota reservation until cleanup can safely release it, and sweep late abandoned objects. These integration details follow [Supabase resumable uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads).

`POST /assets/uploads/:sessionId/complete` carries expected session version; server checks actor, object key, bytes/hash, signature/type and actual metadata, then returns 202 `{data:{assetId,state:"QUARANTINED"}}`. Duplicate complete returns the same processing identity. `GET /assets/:id` returns status/failureCode/renditions to an authorized owner; `DELETE /assets/uploads/:sessionId` cancels once and schedules safe cleanup. Public clients never receive service-role credentials or unrestricted bucket authorization.

`POST /assets/:id/delivery {purpose:"INLINE"|"DOWNLOAD", renditionId?}` returns `{data:{assetId,kind:"PROXY"|"SIGNED_URL",url,expiresAt,contentType,filename}}`. Production bucket is private. App-selected signed URLs are time-limited bearer capabilities and remain valid until expiry independently of app Auth-key changes; vendor revocation limits must be respected. See [Supabase private delivery](https://supabase.com/docs/guides/storage/serving/downloads).

**Selected revocation policy:** protected student lessons/submissions/receipts use an app policy-checking proxy by default, so revocation/retraction is checked on every new range/document/manifest/segment request. The proxy resolves private storage internally, sets no-store and never leaks backing keys. Already delivered bytes cannot be recalled. If operators elect direct signed URLs for an approved lower-risk owner/library use, TTL <=120 seconds and <=effective access expiry; document residual bearer validity and never promise immediate revocation. HLS playlist/segment/key rewriting must protect every child object, not only the manifest. In-flight streams may be stopped on retraction by access-version invalidation; new reads always fail.

Local storage is outside any static/rewrite path and uses the same policy/proxy. For untrusted downloads use a separate content origin without app cookies, `nosniff`, safe filename and attachment disposition where not verified-inline-safe. Range parsing validates one range, suffix/open ranges, proper MIME and 206/416; disconnect/errors release resources. A production storage error returns pending/503 and never silently writes local disk.

Cleanup is mark-and-sweep: unreferenced abandoned uploads after configured grace/provider lifetime, failed/quarantine per approved retention, never a referenced published original, historical student submission, payment evidence or legal hold. References are counted across revisions/attempts, not just the current course. Migrate legacy URLs through protected ID adapters and disable every old public alias.

## C04 — exact revision actions

```text
Editable draft --submit(snapshot/hash)--> IN_REVIEW
IN_REVIEW --admin decision--> APPROVED | CHANGES_REQUESTED
APPROVED --publish exact revision--> PUBLISHED (atomic current pointer)
Editing an in-review/published revision forks a new editable draft.
```

`PATCH /studio/courses/:id/draft` requires If-Match. A missing precondition is rejected, stale ETag is 412. Submission freezes the entire ordered content/reference snapshot and gives `revisionId`/hash. `POST /studio/courses/:id/revisions/:revisionId/submit` runs completeness; teacher cannot publish directly. `POST /admin/revisions/:revisionId/approve|request-changes` carries expectedHash and reason; `/publish` accepts exact approved revision/hash and expected course publication version. Admin-owned direct publish still freezes/validates/audits the revision, recording self-publication rather than inventing another reviewer.

```json
{
  "revisionId": "r_3",
  "expectedHash": "sha256:example",
  "expectedCourseVersion": 8,
  "reason": "Reviewed supplied examples, translations and answer keys"
}
```

Completeness checks taxonomy, required locale variants, rights declaration, all required block types/fields, READY/authorized assets, valid referenced assessment versions/keys/rubrics, preview/lifecycle and no disabled required capability. A disabled advanced block may appear only as an optional clearly staged item; a required board/code/offline interaction blocks publication until enabled or replaced through review. Detect such legacy published courses and exclude them from paid pilot until corrected, preserving their original snapshots. Review approval refers to immutable bytes; a concurrent edit must not change approved content. Publish pointer/audit/outbox commit atomically. Repeated command/key returns same decision; incompatible prior state is 409. Rollback is an audited pointer to a previously approved snapshot, not mutation/deletion of history.

Course revision snapshots reference immutable assessment version IDs; private key/rubric grading records remain inside the assessment service and are not copied into a student revision DTO. LRN-02 establishes definition versions before LRN-05 binds published course revisions to them. The broader provenance/issue UI may extend the basic required rights declaration later in ENH-05 without introducing a second revision state machine.

## C05 — assessments, assignments and grades

Extend existing Assessment/QuestionPool/QuestionItem into canonical versioned engine. Question types: SINGLE_CHOICE, MULTIPLE_CHOICE, TRUE_FALSE, SHORT_ANSWER, ESSAY. Owner/explicit bank grants control authoring; shared bank read does not imply edit. Legacy Quiz routes translate through stable mapping; raw legacy internal rows are never a student DTO.

`POST /assessments/:id/attempts` starts or resumes one allowed attempt with scoped key. Server freezes version/question IDs/order, points, rubric/normalization policy, selected language and randomization seed. It enforces open/close/due/max attempts. `expiresAt=min(start+duration,closeAt)`; `serverNow` enables display offset. An expired attempt commits terminal state before error response.

```json
{
  "data": {
    "id": "at_1", "versionId": "av_4", "status": "IN_PROGRESS",
    "serverNow": "2026-11-01T10:00:00Z", "expiresAt": "2026-11-01T10:20:00Z",
    "answerVersion": 0, "savedAnswers": {},
    "questions": [{"id":"qv_1","type":"SINGLE_CHOICE","prompt":{"ar":"..."},"points":1,"options":[{"id":"a","text":{"ar":"..."}},{"id":"b","text":{"ar":"..."}}]}]
  }
}
```

`PUT /attempts/:id/answers` takes `expectedAnswerVersion` and answer map; accepted update increments version. Objective answers reference option IDs; short/essay answer is bounded supplied text. Unknown question IDs, unsupported answer shape, late/terminal state or stale version fail without changing grading. `POST /attempts/:id/submit` atomically claims terminal submission and dedupes; expire/submit race has one outcome.

Safe result: `{data:{id,versionId,status,score:number|null,maxScore,gradedPoints,pendingQuestions,submittedAt,gradeVersion}}`. Private `questionsSnapshotJson`, `correctAnswer`, `correctAnswerJson`, option correctness and internal rubric keys never appear in ordinary results/start/history. Review endpoint separately authorizes answer release (`NEVER` by default, or AFTER_CLOSE after exact close and policy); no unrelated teacher shortcut. Pending results show score=null and graded/pending detail, not a fabricated final zero.

| Type | Grading policy v1 |
|---|---|
| Single choice / true-false | Exactly one permitted option ID; exact key match |
| Multiple choice | Exact set, no duplicates; zero otherwise unless explicit future versioned partial-credit formula |
| Short answer | Uploader-provided accepted variants; NFC/trim by default, case/diacritic/Arabic normalization only explicitly declared; no inferred translation/synonym |
| Essay | Human rubric review; no string-equality grading |

`POST /attempts/:id/grades` requires assigned reviewer/admin, expectedGradeVersion and per-question score/criterion/feedback. Scores finite within points, rubric sum equals score. Update grade revisions immutably with actual reviewer/reason; only fully graded required questions finalize. Regrading is explicit and auditable; deterministic mastery/certificate consumers recalculate by gradeVersion. Raw snapshots are private grading evidence.

Assignments reference immutable version, prompt/assets, availability/late policy/maxAttempts and supplied rubric. `POST /assignments/:id/submissions` contains client submissionId, text and READY owned asset IDs. Unique `(assignment,student,attemptNo)` plus atomic allocation enforces limits. Late policy is `REJECT` or explicit `ALLOW_WITH_FLAG`; no arbitrary client date. Assignment grading uses expected version, 0..maxScore, feedback and authorized grader. Downloaded submission files require own-student/assigned-grader policy. Preserve original submission/grades on course changes.

## C06 — human-supplied import packages

Supported v1 package kinds: ASSESSMENT, ASSIGNMENT and QUESTION_BANK. JSON <=10 MiB and <=1,000 questions; CSV question banks <=5 MiB and <=5,000 rows. Limits configurable downward and enforced before expensive parse. UTF-8 required; reject unrecognized schemaVersion, duplicate external IDs, unknown fields, invalid locale/keys/points/rubrics/asset references. No URL fetch, ZIP execution, OCR or generated output.

```json
{
  "schemaVersion": 1, "kind": "ASSESSMENT",
  "title": {"ar":"اختبار جمع","en":"Addition quiz"},
  "settings": {"durationSeconds":1200,"maxAttempts":2,"answerRelease":"NEVER"},
  "questions": [{
    "externalId":"q1", "type":"SINGLE_CHOICE", "prompt":{"ar":"١ + ١؟","en":"1 + 1?"},
    "points":1, "outcomeIds":["lo_add"],
    "options":[{"id":"a","text":{"ar":"٢","en":"2"}},{"id":"b","text":{"ar":"٣","en":"3"}}],
    "correctOptionIds":["a"], "explanation":{"ar":"...","en":"..."}
  }]
}
```

Question JSON adds `acceptedAnswers` and declared `normalization` for SHORT_ANSWER; ESSAY has `rubric:[{id,label:LocaleText,maxPoints}]` whose sum equals question points. TRUE_FALSE has two fixed explicit option IDs; MULTIPLE_CHOICE accepts unique option sets and exact-set policy. Question-bank JSON is the same question shape without assessment delivery settings. Correct keys/rubrics exist only in editor/import preview, never student transport.

```json
{
  "schemaVersion": 1, "kind": "ASSIGNMENT",
  "title":{"ar":"واجب","en":"Assignment"}, "prompt":{"ar":"...","en":"..."},
  "assetIds":["owned_ready_asset_id"], "outcomeIds":["lo_1"],
  "settings":{"dueAt":"2026-11-01T18:00:00Z","latePolicy":"REJECT","maxAttempts":2},
  "maxScore":10, "rubric":[{"id":"method","label":{"ar":"الطريقة","en":"Method"},"maxPoints":10}]
}
```

CSV v1 headers: `external_id,type,prompt_ar,prompt_en,option_a_ar,option_a_en,option_b_ar,option_b_en,option_c_ar,option_c_en,option_d_ar,option_d_en,correct_options,points,accepted_answers,outcome_codes,explanation_ar,explanation_en`. Use RFC-style quoted fields/UTF-8 BOM tolerance, `|` within correct_options/accepted_answers/outcome_codes with documented escaping in downloadable template. v1 CSV supports single/multiple/true-false/short-answer; essays/rubrics use JSON. Missing optional columns may be mapped explicitly in preview, required columns cannot be silently guessed. No evaluation of formula-looking cells; escape formula-leading text in later spreadsheet exports.

`POST /imports` references owned packageAssetId, target draft/bank, expectedDraftVersion and kind. Validation creates an expiring ImportSession with checksum/schemaVersion/previewHash and returns counts/errors: `{row:3,path:"questions.2.correctOptionIds",code:"UNKNOWN_OPTION",messageKey:"import.unknownOption"}`. Preview is editor-authorized and contains sensitive keys. `POST /imports/:id/commit` requires exact previewHash/expectedDraftVersion and scoped key after explicit user confirmation. Whole import commits in one transaction; any unresolved error creates no content. Repeated commit returns same created IDs. Stale target/expired session -> conflict; **imports never publish**. Cancel/expiry deletes staged parse data according to retention, keeps safe audit metadata.

## C07 — checkout, vouchers and reconciliation

Money: integer EGP piastres in safe JS range and DB bigint/Decimal serialization with explicit safe conversion; examples are numbers within safe range. Validate >0 paid price, zero only for explicit free offers. No floating multiplication for authoritative charges. EGP amount and product access term are snapshotted at order creation. Optional USD conversion is indicative display only.

`Duration={unit:'DAY'|'CALENDAR_MONTH'|'PERPETUAL', count?:positive integer,timeZone?:'Africa/Cairo'}`. Calendar products require timezone, perpetual forbids count, other units require it. No implicit 180-day grant. Product resource is COURSE, SUBJECT or GRADE_BUNDLE with verified FK/membership; VOUCHER is a redemption mechanism, not an invalid entitlement enum cast. Archived/retracted resources cannot be newly sold.

```json
{
  "data": {
    "id":"o_1", "status":"PENDING_PAYMENT", "version":1,
    "fulfillmentStatus":"NONE", "paymentMethod":"MANUAL_TRANSFER",
    "priceMinor":150000, "currency":"EGP",
    "item":{"productId":"p_1","resourceType":"COURSE","resourceId":"c_1","duration":{"unit":"DAY","count":90}},
    "instructions":{"version":"mi_2","destinationLabel":"operator-verified destination","reference":"student order reference"}
  }
}
```

`POST /commerce/orders` takes productId and method with actor-scoped Idempotency-Key; creates immutable snapshot or returns same intent. `GET /commerce/orders/:id` owner/admin only. `POST /commerce/orders/:id/receipt` takes owned READY receiptAssetId, transfer reference and expectedVersion; enters UNDER_REVIEW once. Server-configured instruction version is snapshotted, not supplied/overridden by student. Private receipt is not settlement proof.

Order payment state: PENDING_PAYMENT → UNDER_REVIEW → PAID or REJECTED/EXPIRED/CANCELLED; eligible rejected payment may create a new reviewed intent with history, not rewrite prior decision. PAID → REFUND_PENDING → REFUNDED. No REFUNDED/CANCELLED → PAID. A refund failure remains REFUND_PENDING with reason; old callbacks cannot overwrite it. Fulfillment state: NONE → PENDING → FULFILLED or FAILED_RETRYABLE; payment success and grant failure are separate durable facts.

`POST /admin/orders/:id/verify` requires current admin, expectedVersion, APPROVE/REJECT, verified transfer reference and reason. Record immutable PaymentEvent, paid transition and unique fulfillment/outbox in transaction; grant effect dedupes by sourceOrderId. Reconcile paid-unfulfilled through `/admin/orders/:id/reconcile` with expected version and audited replay. Refund uses a separate audited command and revokes only source grant, not independent valid subscription/access. Subscription approve/reject and voucher operations use the same financial/access primitives.

`POST /commerce/vouchers/redeem {code,expectedCourseId?}` checks eligibility/validity/capacity with atomic unique VoucherRedemption(voucherId,userId). Checkout supplies a UUID `expectedCourseId`; before consuming usage, the server verifies that the voucher's COURSE, SUBJECT or GRADE_BUNDLE scope applies to that course. A mismatch returns 400 with no usage/grant change. The client checks actual course access before presenting success. Same student repeat returns the same redemption/grant, global max uses cannot be exceeded. Failure rolls back usage. Codes are not logged. The current M0 integration implements the course-context guard; durable per-student idempotency and full concurrent capacity acceptance remain COM-08 work. COM-06 owns payment transition/fulfillment recovery and reconciliation.

Automated provider checkout/callback paths return 503 FEATURE_DISABLED at launch. Post-launch adapters emit only verified PaymentEvent after merchant/order/method/EGP exact amount/status/signature validation. Unique `(provider, merchant, transactionId)` and inbox event key prevent multi-order use/replays; keep all callback evidence safely redacted. Official merchant API/version selection, checkout, callbacks and refund/reconciliation must be independently verified for each provider under COM-04; do not adopt the prototype custom signer as a provider contract.

## C08 — academic references and locale schema

Course requires coherent CurriculumEdition linking stage/grade/optional track/year/term/subject and outcome IDs. Stable admin codes are scoped/unique and translated labels are presentation only. Referenced records archive instead of deleting. No public GET seeds/rewrites defaults. AppConfig has fixed singleton key and version.

`contentLanguage=AR` requires Arabic teaching fields; EN requires English; BILINGUAL requires both for publication. defaultContentLocale must be supplied. LocaleText values have bounded nonempty supplied text, HTML only in explicitly sanitized rich-text blocks. Empty translation is an unresolved issue, not a generated fallback. Existing monolingual legacy text must be labeled after verification rather than assigned an invented language. `/ar`/`/en` is authoritative UI locale; viewing an EN-only lesson in Arabic interface clearly labels EN teaching text.

## C09 — progress and completion

`POST /progress/heartbeats` carries lessonId/blockId, playback sessionId, monotonic seq, positionMs and bounded playedDeltaMs. Server checks access, verified media duration, wall-time tolerance and dedupes session/seq. Merge watched intervals, cap inflated time and store resume position with explicit accepted timestamp; repeated/out-of-order updates cannot inflate completion. Return acceptedSeq/resumeMs/syncStatus. Completion policy is versioned by required block type; opening a page is not concept mastery. Failed writes remain visibly pending/failed on client and retries preserve event identity. Stable lesson completion survives canonical parent migration.

Staged mastery uses finalized outcome-mapped grades, explicit ruleVersion and evidence count; rule v1 requires at least three finalized eligible questions and average normalized score >=0.8 for MASTERED, otherwise DEVELOPING/INSUFFICIENT_EVIDENCE as documented. Educator review of actual rule fixtures is required. No AI prediction and no watch-time-to-understanding inference.

## C10 — durable jobs, capabilities and personal operations

Event envelope: `{id,type,schemaVersion:1,aggregateId,aggregateVersion,occurredAt,actorId,data}`. Data carries minimum entity references; no credential/answer/receipt body. Mutation+AuditLog+OutboxEvent commit together; DB failure is failure. Actual actor FK or explicit system actor convention, never literal ADMIN pretending to be a user. Dispatcher/consumer replay is at least once with unique effect keys; status QUEUED/PROCESSING/SUCCEEDED/FAILED_RETRYABLE/DEAD_LETTER and attempt history.

Notifications unique by event/recipient/channel, preferences split essential security/transactional from optional study/announcement email. Inbox/read actions owner-only. Announcements snapshot effective audience/asOf and track delivery; no immediate all-delivered claim. Manual live links allow HTTPS admin-approved hosts and protect host secrets; do not server-fetch arbitrary URLs.

Capabilities: effective enablement requires implemented+reviewed gate, env not hard-off and current configured permission. Disabled API returns FEATURE_DISABLED before any effect. Teacher admin review is invariant, not bypassable flag. AI endpoints are removed, not toggled. Launch advanced disabled matrix is normative in testing gates.

Privacy/support commands create verified-owner requests with durable job/status and retention/legal-hold decisions approved by policy owners; exports are private expiring assets, deletion reconciles backup restore via deletion ledger. Guardian linkage/portal/certificates/offline/realtime/execution/dev integrations add separately versioned schemas only under their owning staged task. No speculative endpoint provides those privileges until enablement.

## Compatibility and contract verification

Keep legacy course/lesson/quiz URLs/IDs through explicit adapters; document secure 404/410/field-removal behavior. Date/price/grading semantics are versioned in snapshots, never reinterpreted retroactively. Published revisions and attempts remain immutable. If original historical keys cannot be established, keep score/provenance unknown and prohibit silent regrading.

CI compiles shared/client/server contracts, validates outputs recursively for forbidden data, tests every high-risk route and checks migration upgrade fixtures. Schema additions must name owning task and consumer tests; no alternate DTO/engine/state vocabulary hidden in a component. [Task template](TASK_TEMPLATE.md) and [release gates](TESTING_RELEASE_GATES.md) define completion evidence.
