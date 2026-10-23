/* Documentation authoring only. Run from any cwd; never loads app code or a database. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { date, implementationCommit, taskUpdate } = require('./current-state.cjs');
const { retiredRootDocs, historicalDocMoves, taskDocument, rewriteLinks } = require('./doc-layout.cjs');
const root = path.resolve(__dirname, '../..');
const docs = path.join(root, 'docs');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, s) => {
  if (retiredRootDocs[p]) return;
  const output = historicalDocMoves[p] || p;
  const f = path.join(root, output);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, rewriteLinks(s.trim(), p, output, tasks) + '\n', 'utf8');
};
const tasks = [];
// Each row supplies implementation-specific detail; shared protocols live in the linked specifications.
function task(id, title, p, m, deps, paths, target, steps, example, controls, migration, tests, done, owner = 'Platform engineering') {
  tasks.push({ id, title, priority: p, milestone: m, status: 'Planned', dependencies: deps.split(' ').filter(Boolean), paths: paths.split(' '), target, steps, example, controls, migration, tests, done, owner });
}
const source = read('audit/PRODUCT_READINESS_REVIEW.md');
const findings = new Map();
for (const match of source.matchAll(/^### (SEC-\d{2}) — ([^\n]+)\n([\s\S]*?)(?=^### |^## )/gm)) {
  findings.set(match[1], { title: match[2], evidence: match[3].trim() });
}
for (const match of source.matchAll(/^\| ((?:COM|LRN|ENG)-\d{2}) \/ ([^|]+)\|([^|]+)\|([^|]+)\|/gm)) {
  findings.set(match[1], { title: match[2].trim(), evidence: match[3].trim(), recommendation: match[4].trim() });
}
const originalCases = new Map([...read('audit/TEST_GAP_MATRIX.md').matchAll(/^\| (A\d{2}) \| (P\d) \| (.+) \|$/gm)].map(m => [m[1], m[3]]));
const milestoneNames = {
  M0: 'Scope and immediate safety', M1: 'Foundation and content delivery',
  M2: 'Authoring and learning', M3: 'Paid release and operations', M4: 'Post-launch enhancements'
};
const statusOverrides = {
  'SCOPE-01': 'Complete',
  'SCOPE-02': 'Complete',
  'ENG-01': 'Complete',
  'SEC-01': 'Complete', 'SEC-02': 'Complete', 'SEC-03': 'Complete',
  'SEC-04': 'Complete', 'SEC-05': 'Complete', 'SEC-08': 'Complete',
  'SEC-09': 'Complete', 'SEC-10': 'Complete', 'SEC-11': 'Complete',
  'SEC-15': 'Complete', 'ENG-03': 'Complete', 'ENG-02': 'In Progress', 'ENG-05': 'In Progress', 'ENG-06': 'In Progress', 'ENG-09': 'In Progress', 'ENG-13': 'In Progress',
  'ENG-15': 'Complete'
};

task('SCOPE-01', 'Establish the uploader-driven product specification', 'P0', 'M0', '',
 'README.md task.md implementation_plan.md Educational_Platform_Requirements_and_Test_Plan.md Educational_Platform_System_Design_Document.md project_overview_and_usage_guide.md',
 'Make human-supplied content and Arabic/English presentation the authoritative product direction, covering every school stage through configuration.',
 ['Backend: inventory current capabilities with source evidence; distinguish implemented prototype paths from advertised release capabilities.', 'Frontend: remove active product copy promising automatic educational production; describe editor, upload, import, review and student delivery responsibilities.', 'Database: no runtime schema change in this task; document taxonomy, revision and asset changes owned by other tasks.', 'Configuration/infrastructure: version capability flags and release gates in docs; archive prior requirements and mark old plans superseded.', 'Documentation: maintain the 77-task backlog, 58-finding traceability and 42-case disposition; name a single owner wherever tasks share work.'],
 'Capability declaration: {"contentSource":"UPLOADER","interfaceLocales":["ar","en"],"automatedGateways":"STAGED"}',
 'Product and engineering owners review scope changes. A documentation update does not enable a runtime capability. Status stays Planned until implementation evidence is reviewed; preparing this package is not release sign-off.',
 'Copy prior documents byte-for-byte into docs/archive before replacing entry points. Preserve audit observations and baseline hashes; identify the withdrawn AI roadmap explicitly. Restore a prior document only with a superseded banner, never as an accidental active specification.',
 ['Verify every active product entry point leads to PRODUCT_SCOPE.md and no active generation/tutoring requirement remains.', 'Check all 77 IDs, 58 findings, 42 acceptance dispositions, links, ordering and DAG using the documentation validator.', 'Have Arabic/English product reviewers read audience, content-language and teacher-approval rules; no production API behavior is claimed by these docs.'],
 ['All repository entry documents state the revised mission and implementation status accurately.', 'Historical evidence remains accessible and withdrawn recommendations are labeled.'], 'Product owner and documentation maintainer');

task('SCOPE-02', 'Remove AI tutoring, generation and provider dependencies', 'P0', 'M0', 'SCOPE-01 ENG-03',
 'server/src/app.ts server/package.json server/package-lock.json server/.env.example server/src/modules/ai/__tests__/ai.integration.spec.ts client/src/app/layout.tsx client/src/components/VideoPlayerSection.tsx',
 'Remove tutor UI, route mounting, SDK, configuration, fabricated fallback answers and active claims; retain only uploader-created educational content.',
 ['Backend: remove AI controllers/routes/provider calls; retain a temporary explicit 410 tombstone at the legacy tutor endpoint without processing prompts.', 'Frontend: remove drawer, launch buttons, imports, state, API helpers and tutor-specific strings; show no replacement answer.', 'Database: inventory provider/prompt artifacts before deletion; no destructive user-content purge; apply approved retention via ENH-16.', 'Configuration/infrastructure: remove GEMINI_API_KEY and AI provider startup checks, CI secrets and SDK lockfile entries; coordinate secret revocation with operators after confirming usage.', 'Tests: replace nonempty-answer smoke assertions with no exposed tutor and no provider network calls; remove generation roadmap requirements while keeping historical reports.'],
 'POST /api/v1/ai/tutor (existing legacy route) -> 410 {"error":{"code":"CAPABILITY_REMOVED","messageKey":"capability.removed","requestId":"req_1"}}',
 'No role, feature flag or direct endpoint may re-enable the removed capability. Tombstone must not echo prompts or contact providers. Upload processing may validate/transcode/extract thumbnails but never creates teaching text, translations, narration or captions.',
 'Inventory references with rg before removal; preserve authored courses and uploaded files. Keep a short compatibility tombstone through one published deprecation period, then remove it. Rollback must not restore a known exposed tutor; redeploy the patched API with the tombstone if UI removal fails.',
 ['Anonymous/student/teacher/admin direct calls receive 410 or removed-route 404 with zero provider requests.', 'Clean server/client installs and builds succeed without the provider SDK or key.', 'Arabic/English browser player contains no tutor entry point; uploaded lessons and quizzes continue to render.'],
 ['No executable AI provider reference, fallback answer, credential requirement or tutor UI remains.', 'Historical AI recommendations are explicitly withdrawn and A34–A37 replacements pass.']);

task('SEC-01', 'Replace known privileged seeds with safe provisioning', 'P0', 'M0', 'SCOPE-01',
 'server/prisma/seed.ts server/create-admin.js server/.env.example',
 'Reference-data seeding is safe in production; privileged accounts require explicit one-time provisioning and never receive a fixed/reset password from seed.',
 ['Backend: split reference seed and local demo fixture commands; production demo seeding must abort before writes.', 'Frontend: no new public admin registration; route setup invitations to existing secure account flow.', 'Database: use unique administrator identity provisioning with explicit operator input and bcrypt; existing users are never role/password-updated by reference seed.', 'Configuration/infrastructure: remove privileged literals, inventory deployment/history use, rotate affected live credentials and sessions through an operator runbook; keep secret values out of logs/docs.'],
 'Reference seed result: {"createdReferenceRows":12,"usersModified":0}; demo command requires NODE_ENV=development and an explicit disposable database allowlist.',
 'Only an authenticated operator with database provisioning authority can create an initial admin. Repeated reference seeds are idempotent; concurrent provisioning obeys unique identity constraints and does not overwrite an existing account.',
 'Do not delete existing administrators. Record affected account IDs privately, force reset/revoke sessions if deployed, and retain an audit record. Rollback may restore reference data, never the old credential literal or seed password reset behavior.',
 ['Run reference seed twice against a populated snapshot; assert every password hash and role unchanged.', 'Production demo/provision commands with missing secrets abort with zero user mutations; concurrent duplicate admin creation produces one account.', 'Login with pre-seed credentials still works only for unchanged legitimate accounts; published guides expose no password.'],
 ['No known privileged password remains in tracked seed paths.', 'Operator records credential remediation and safe repeated seeding evidence.'], 'Identity and operations');

task('SEC-02', 'Close raw-file bypasses with authorized private delivery', 'P0', 'M0', 'SEC-04',
 'server/src/app.ts server/src/utils/storage.ts server/src/modules/videos/video.service.ts server/src/modules/materials/material.service.ts server/src/modules/assignments/assignment.service.ts',
 'Every existing protected file requires the same learning/submission/receipt policy as its parent resource, including legacy local paths and cloud objects.',
 ['Backend: remove catch-all express.static uploads and public-URL issuance; add protected legacy resource-ID adapters that resolve policy before streaming/signing.', 'Frontend: request short-lived delivery grants rather than concatenate upload URLs; handle expiry by requesting a new grant.', 'Database: inventory existing files and ownership mappings; maintain old resource-ID mapping until ENH-03 migrates references to asset IDs.', 'Configuration/infrastructure: make educational buckets private, deny public aliases, protect local root outside static/proxy paths; use a storage canary before enabling traffic.'],
 'POST /api/v1/assets/asset_1/delivery {"purpose":"INLINE"} -> {"data":{"assetId":"asset_1","url":"<short-lived capability>","expiresAt":"2026-11-01T10:02:00Z"}}',
 'Students: entitled published lesson, own submission/receipt only. Teacher: owner/assigned grader. Admin: audited access. Default download grant TTL is at most 120 seconds and bounded by access expiry; retraction denies new grants. Strictly immediate revocation requires the policy-checking proxy described in C03.',
 'Inventory/checksum first, dual-read only through protected adapters, cut off all old public paths before release. Historical URLs must not remain a security compatibility path. Storage outage fails 503, never local public fallback; restore private object backups if migration fails.',
 ['Anonymous and another student cannot GET known raw video/material/submission/receipt paths; entitled and assigned-grader grants succeed.', 'Expired/revoked grant, archived purchased access, retracted course and proxy/cache behavior follow C02/C03.', 'Arabic/English browser playback/download works after token expiry without exposing bucket public URLs.'],
 ['No local or Supabase public alias bypasses policy.', 'Cross-account file tests and direct-origin canary pass.'], 'Asset security; ENH-03 owns the final media library');

task('SEC-03', 'Reject disguised active content and quarantine uploads', 'P0', 'M0', 'SEC-02',
 'server/src/modules/assignments/assignment.routes.ts server/src/modules/materials/material.routes.ts server/src/modules/videos/video.routes.ts server/src/utils/storage.ts',
 'Filename, declared MIME, detected signature and permitted purpose must agree before a file can become deliverable.',
 ['Backend: centralize a bounded allowlist/signature validator; server-generate object keys; reject HTML/JS/SVG active content by default, traversal and mismatched extensions.', 'Frontend: present validation/quarantine status and localized actionable errors without trusting client checks.', 'Database: record detected media type, size, checksum and validation outcome with legacy-file quarantine mapping.', 'Configuration/infrastructure: scan in an isolated processing worker; serve untrusted downloads on a separate uncredentialed origin, nosniff and attachment disposition for non-inline-safe formats; fail closed when scanner unavailable.'],
 'Upload PDF with filename="lesson.html", contentType="application/pdf" -> 422 VALIDATION_ERROR at file.type; scanner outage -> accepted quarantine record, never READY.',
 'Apply identical validation to materials, submissions, receipts, import packages and caption files; only purpose-approved types differ. Never execute/parse unbounded archives in the API. Complete/finalize repeats do not bypass quarantine.',
 'Scan existing uploaded assets and quarantine unknown/mismatched files without deleting student work. Allow an operator to recover verified files under new safe keys; rollback preserves quarantine and separate origin.',
 ['Harmless .html/.js labeled PDF, invalid magic bytes, polyglots, double extensions and oversized files cannot become public/deliverable.', 'Valid Arabic-named PDFs and supported media survive scan; another user cannot complete or download the session.', 'Concurrent finalize/scanner retry publishes one state transition; browser content cannot execute in app origin.'],
 ['Spoofing probes now assert rejection/quarantine and no executable response.', 'Scanner failure and historical-file remediation are observable.'], 'Upload security; ENH-03 owns worker scheduling');

task('SEC-04', 'Separate public catalog DTOs from protected learning DTOs', 'P0', 'M0', '',
 'server/src/modules/courses/course.service.ts server/src/modules/courses/course.routes.ts server/src/modules/collections/collection.service.ts client/src/components/VideoPlayerSection.tsx client/src/lib/apiTypes.ts',
 'Public reads expose curated discovery metadata; protected lesson bodies, blocks, assessment content and asset grants are serialized only after an explicit access decision.',
 ['Backend: build allowlisted CatalogCourse/CatalogLesson serializers; add protected learning delivery service and strip nested resources from list/detail/section/collection routes.', 'Frontend: fetch catalog and learning separately; remove reliance on protected resources preloaded in catalog payloads.', 'Database: project selected columns and bounded lesson summaries; no destructive schema change for the immediate fix.', 'Configuration/infrastructure: purge old public response caches, set protected responses private/no-store and add response-schema security tests.'],
 'GET /api/v1/courses/c_1 -> {"data":{"id":"c_1","title":{"ar":"رياضيات"},"lessons":[{"id":"l_1","title":{"ar":"الجبر"},"isPreview":false}]}}; GET /api/v1/learning/lessons/l_1 -> 403 ACCESS_REQUIRED without a grant.',
 'Catalog never returns text bodies, block configs, raw object keys, live host links or question keys, including for an authenticated teacher browsing public routes. Learning policy initially denies safely; COM-01 extends access-source parity. Preview delivery is explicit under LRN-09.',
 'Version unsafe clients to new DTOs; do not preserve leaked fields as compatibility. Keep legacy lesson IDs and catalog URLs. If rollout fails, disable protected reads and repair clients rather than re-expose nested resources.',
 ['Recursively inspect list/detail/sections/collections across guest/student/unrelated teacher/admin public browsing for forbidden fields.', 'Entitled learning response supplies required content; unauthorized IDs and draft sibling content are denied.', 'Two users through the same cache never receive each other’s learning payload; Arabic/English catalog remains usable.'],
 ['A04 has allowlist assertions and source query projection.', 'Direct API calls cannot bypass the visual paywall.'], 'Learning access; COM-01 owns the final shared policy');

task('SEC-05', 'Eliminate answer-key leaks through explicit question DTOs', 'P0', 'M0', 'SEC-04',
 'server/src/modules/courses/course.service.ts server/src/modules/quizzes/quiz.controller.ts server/src/modules/assessment/assessment.service.ts',
 'Every public/student question response is built from allowed fields; internal keys and explanations are returned only through separately authorized review policy.',
 ['Backend: replace object-spread sanitization with public question/result serializers for all supported types; use the same serializers on nested catalog compatibility routes.', 'Frontend: consume option IDs and prompts without correctness flags; review screens request an explicitly authorized review DTO.', 'Database: no key deletion; preserve private grading data and historical results.', 'Configuration/infrastructure: add recursive forbidden-field tests including correctAnswer, correctAnswerJson, questionsSnapshotJson and option correctness, then invalidate leaked response caches.'],
 'StudentQuestion = {"id":"q_1","type":"SHORT_ANSWER","prompt":{"ar":"..."},"points":2}; correctAnswer and explanation are absent, not null placeholders copied from a row.',
 'Assessment author/assigned reviewer privileges are separate from teacher role. A terminal attempt does not automatically reveal answers. SEC-08 owns attempt response adoption; SEC-07 owns read/edit ownership.',
 'Do not modify keys or historical scores to achieve redaction. Remove fields from unsafe DTOs immediately, document the security compatibility break, and never roll back to raw-row serialization.',
 ['Every question type at catalog/start/get/submit/expire/history endpoints has recursively forbidden fields absent.', 'Owner/admin authoring paths still return keys after explicit authorization; unrelated approved teacher is denied.', 'Arabic/English question rendering, partial grade display and allowed post-close answer review use separate safe contracts.'],
 ['A05 covers all representations and endpoints, including nested snapshots.', 'No object-spread serializer can accidentally expose new grading fields.'], 'Assessment serialization');

task('SEC-06', 'Enforce public, unlisted and private visibility consistently', 'P1', 'M1', 'SEC-04 COM-01',
 'server/src/modules/courses/course.service.ts server/src/modules/collections/collection.service.ts server/src/modules/careers/careers.service.ts',
 'PUBLIC is discoverable; UNLISTED is link-discoverable metadata only; PRIVATE metadata requires owner/admin or active assigned membership. Learning always requires its own access decision.',
 ['Backend: add visibility predicates to catalog/search/collections/recommendation queries; use one detail policy to prevent ID enumeration.', 'Frontend: separate public catalog from teacher studio; label unlisted/private state without treating URL secrecy as access.', 'Database: index publication/visibility and preserve configured visibility values.', 'Configuration/infrastructure: invalidate public caches on visibility changes and use private/no-store for membership-specific metadata.'],
 'GET /api/v1/courses?visibility=PRIVATE as guest -> 422 unsupported public filter; GET private c_1 without membership -> 404 NOT_FOUND.',
 'Published is necessary but insufficient. Private membership follows effective grants, not a stale UI flag. Concurrent visibility changes invalidate cache versions; new learning requests use current state.',
 'Audit existing PRIVATE/UNLISTED courses before rollout; keep ownership and grants. Do not silently convert them to PUBLIC during backfill. Rollback keeps the stricter policy.',
 ['Visibility × publication × guest/member/nonmember/owner/admin matrix covers list, detail, collection and direct learning.', 'Private titles/counts do not leak through search facets; unlisted course omitted from lists but link metadata works.', 'Browser switch public/private and refresh in Arabic/English; cache cannot retain old discoverability.'],
 ['All discoverability surfaces share the matrix.', 'Reproduced anonymous PRIVATE fixture is denied.']);

task('SEC-07', 'Scope quiz and question-bank privileges to owners and assignments', 'P1', 'M1', 'SEC-05 ENG-05',
 'server/src/modules/quizzes/quiz.controller.ts server/src/modules/quizzes/quiz.service.ts server/src/modules/assessment/assessment.service.ts server/prisma/schema.prisma',
 'Approved teachers may read keys or edit only owned/explicitly assigned assessments and banks; sharing is an explicit grant.',
 ['Backend: pass actor separately, enforce assessment/bank ownership on every read/write/clone route, including standalone quizzes.', 'Frontend: show only writable banks in authoring pickers and distinguish shared read-only banks.', 'Database: backfill ownerId/createdById and ContentAssignment grants; ambiguous standalone records become admin-managed until assigned.', 'Configuration/infrastructure: publish ownership denial metrics without revealing private assessment titles.'],
 'POST /api/v1/question-pools/p_1/grants {"teacherId":"t_2","capability":"READ"} requires owner/admin; READ never implies EDIT or published answer-review access.',
 'Global TEACHER role never authorizes answer keys. Clone requires source read permission and creates a new owner/revision; failed cross-account requests are 404. LRN-02 owns version migration.',
 'Infer ownership only from reliable course/creator evidence. Preserve uncertain legacy banks read-only for admin assignment; keep old quiz IDs through adapters. Rollback retains new ownership ACLs.',
 ['Teacher A cannot GET keys, edit, delete or attach teacher B’s quiz/bank by guessed ID.', 'Assigned read-only teacher can inspect source but cannot mutate; revoked approval invalidates access.', 'Concurrent grant revoke/edit and Arabic/English owner pickers enforce server decisions.'],
 ['No global teacher-key shortcut remains.', 'Every legacy standalone record has a documented owner or admin quarantine.']);

task('SEC-08', 'Use safe assessment result and expiry responses', 'P1', 'M0', 'SEC-05',
 'server/src/modules/assessment/assessment.service.ts server/src/modules/assessment/assessment.controller.ts client/src/components/player/AssessmentRunner.tsx',
 'Submit, expire, history and review responses expose only student-safe attempt summaries unless a separate answer-review policy permits more.',
 ['Backend: replace raw attempt return values with AttemptResultDTO on every terminal branch, including repeated submit and auto-expire.', 'Frontend: render pending/manual scores without internal snapshots; load permitted review separately.', 'Database: keep questionsSnapshotJson private and unchanged for grading/audit.', 'Configuration/infrastructure: forbid snapshots in logs/traces and apply no-store response headers.'],
 'AttemptResult = {"id":"at_1","status":"AWAITING_REVIEW","score":null,"maxScore":20,"gradedPoints":10,"pendingQuestions":1,"versionId":"av_1"}',
 'A student can read only their own attempt; assigned reviewer/admin uses an explicit grading endpoint. Repeating submit returns the same safe projection. ReleaseAnswer policy defaults NEVER until configured with after-close checks.',
 'No snapshot purge or regrading. Upgrade serializers first and adapters afterward; rollback may disable result endpoint but never return raw records.',
 ['Submit/expire/repeat/history responses recursively exclude correctAnswerJson and snapshots for all types.', 'Another student/unrelated teacher cannot read the attempt; authorized grade queue can access needed private keys.', 'Terminal attempts before/after answer-release time show exactly allowed fields in Arabic/English.'],
 ['F05 regression asserts absence of internal fields after both submit and expire.', 'Client does not depend on private snapshots.']);

task('SEC-09', 'Bind teacher actions to the authenticated actor', 'P1', 'M0', '',
 'server/src/modules/teacher/teacher.controller.ts server/src/modules/live/live.controller.ts server/src/utils/schemas.ts',
 'Announcements and live sessions use the authenticated actor and authorized content owner; request fields cannot substitute another teacher.',
 ['Backend: accept actor as separate service argument; use strict schemas rejecting teacherId, creatorId and actorId in public mutation bodies.', 'Frontend: remove identity fields from request types; submit courseId and valid user-entered fields only.', 'Database: preserve genuine owner/creator audit fields; inspect potentially forged existing records privately.', 'Configuration/infrastructure: log rejected identity field attempts without full request bodies.'],
 'createAnnouncement(actor, {courseId:"c_1", title:{ar:"..."}, body:{ar:"..."}}); body.teacherId -> 422 UNKNOWN_FIELD.',
 'An admin acting on assigned content is recorded as actorId=admin and ownerId=teacher; impersonation is never inferred from body. Idempotency is scoped to actor and course. Ownership checked inside the mutation transaction.',
 'Review suspicious actor/owner mismatches with audit evidence; do not blindly reassign legitimate admin edits. Existing records remain until verified correction; rollback never restores body spread override.',
 ['F07/F08 forged teacherId is rejected and zero unauthorized notifications/meetings are created.', 'Valid teacher A course succeeds; B course and unapproved teacher denied.', 'Parallel actor requests keep independent authors; Arabic/English forms work without hidden identity fields.'],
 ['No controller constructs identity before a spread of untrusted data.', 'Audit records distinguish acting user from content owner.']);

task('SEC-10', 'Revoke authorization on every security-sensitive account change', 'P1', 'M0', '',
 'server/src/modules/auth/auth.middleware.ts server/src/modules/auth/auth.service.ts server/src/modules/admin/admin.service.ts server/prisma/schema.prisma',
 'Role, password, approval and activation changes invalidate old authorization on the next protected request across all API instances.',
 ['Backend: route mutations through one identity service; compare current authVersion/account state for protected requests rather than trust stale role claims.', 'Frontend: clear privileged caches on terminal auth changes and require reauthentication; avoid using persisted role as authority.', 'Database: add User.authVersion and session/family references; update version plus revoke sessions atomically with role/password/status changes.', 'Configuration/infrastructure: use a shared revocation record/cache invalidation with bounded TTL; fail protected authorization closed if current state cannot be verified.'],
 'JWT includes sub, sessionId, authVersion; PATCH /api/v1/admin/users/u_1 {"role":"STUDENT"} increments version and revokes relevant families in the same transaction.',
 'Every admin route and self password change uses the same operation; prevent last-admin removal and audit actor/target. Cache invalidation retries via durable events; DB version is authoritative during cache failure.',
 'Backfill authVersion=1, invalidate old tokens without version at cutover, retain session audit history. No automatic elevation from legacy JWTs. Rollback requires session invalidation, not accepting old claims.',
 ['F12 stale ADMIN claim denied when current user is STUDENT; pending/rejected/deactivated claims likewise.', 'Mutate through each admin edit route and password path; next request on two API instances is denied.', 'Race edit/request/refresh; no old-version successor survives; Arabic/English session-ended UI is accurate.'],
 ['Security mutations and revocation commit together.', 'Cross-instance next-request tests pass for every mutation entry point.'], 'Identity');

task('SEC-11', 'Apply a consistent pending and rejected teacher policy', 'P1', 'M0', 'SEC-10',
 'server/src/modules/auth/auth.service.ts server/src/modules/auth/mfa.controller.ts server/src/modules/auth/auth.middleware.ts',
 'PENDING and REJECTED teacher accounts cannot obtain a normal platform session; an explicit approval/status flow is separate from learning authorization.',
 ['Backend: centralize accountCanAuthenticate and approvedTeacher predicates for login, refresh, MFA completion and protected calls.', 'Frontend: localize pending/rejected messaging and appeal/support contact without presenting a logged-in dashboard.', 'Database: approval decision stores reason, actual admin actor and authVersion change.', 'Configuration/infrastructure: rate-limit status/auth flows; prevent account enumeration outside a successful password/challenge proof.'],
 'Correct credentials for REJECTED teacher -> 403 ACCOUNT_NOT_APPROVED after credential verification; no access/refresh cookie is issued.',
 'STUDENT and ADMIN policies remain explicit. Rejecting an already authenticated teacher revokes through SEC-10. Reapproval requires a new session; refresh cannot change approval implicitly.',
 'Inventory active rejected teacher sessions and revoke at rollout. Retain owned drafts and review history. Restoring account status is an audited admin action, not a seed update.',
 ['Password login, refresh and MFA completion deny both PENDING/REJECTED teachers.', 'Approved teacher succeeds; rejection after challenge creation prevents completion.', 'Arabic/English approval/status UI never grants hidden authoring API access.'],
 ['F11 no longer issues a normal session.', 'All authentication entry points use the same account-state policy.']);

task('SEC-12', 'Apply learning access to discussions, assignments and banks', 'P1', 'M1', 'COM-01 SEC-07',
 'server/src/modules/discussions/discussion.controller.ts server/src/modules/assignments/assignment.routes.ts server/src/modules/assessment/assessment.routes.ts',
 'Read and write authorization follows current course access and parent relationships for discussions, assignments and private banks.',
 ['Backend: resolve lesson→course server-side, verify supplied courseId matches; apply AccessPolicy before lists/details/posts/files and assigned reviewer checks before grading.', 'Frontend: show access-required states for discussions and assignments; remove global private bank pickers.', 'Database: add verified relationship FKs/backfill orphan quarantine; assignment owner/grader uses explicit grants.', 'Configuration/infrastructure: paginate/moderate discussions and rate-limit posts; log denied IDs without content.'],
 'POST /api/v1/discussions {"courseId":"c_1","lessonId":"lesson_from_c2","body":"..."} -> 422 RELATIONSHIP_MISMATCH; unrelated member GET assignment -> 404.',
 'Preview access does not imply posting, assignment submission or bank access. Admin/owner may preview drafts through studio routes. Membership expiry takes effect on new operations; history remains available only under documented personal-record policy.',
 'Backfill associations from valid lessons; preserve orphan student submissions in admin quarantine, never delete on FK creation. Rollback retains guards and legacy protected adapters.',
 ['Student without access cannot read/post threads or list assignment details/files by ID.', 'Cross-course forged association and unrelated teacher bank operations fail with zero writes.', 'Concurrent expiry/post and Arabic/English browser read/write tests match media/access outcomes.'],
 ['Every associated read/write route is covered by policy tests.', 'No assignment or question-pool endpoint relies only on authenticated role.']);

task('SEC-13', 'Consume refresh tokens atomically and define tab-race handling', 'P1', 'M1', 'SEC-10 ENG-05',
 'server/src/modules/auth/auth.service.ts client/src/lib/api.ts server/prisma/schema.prisma',
 'One refresh token creates at most one successor; ordinary tab races are recoverable without revoking unrelated sessions.',
 ['Backend: atomically claim token with revokedAt IS NULL and expected family/version; create successor in the same transaction with a unique parent reference.', 'Frontend: single-flight refresh in a tab plus Web Locks/BroadcastChannel coordination; losing tab retries with the newly installed cookie after a bounded conflict.', 'Database: add familyId, parentId uniqueness, consumedAt and compromise metadata; preserve hashed token storage.', 'Configuration/infrastructure: define immediate-race conflict window of 5 seconds: consumed token reuse in window returns 409 REFRESH_ALREADY_ROTATED without a successor; reuse later revokes only its family.'],
 'POST /api/v1/auth/refresh -> 200 successor once; overlapping consumed token -> 409 REFRESH_ALREADY_ROTATED; proven later replay -> 401 SESSION_REVOKED for that family.',
 'Conditional finding: first reproduce with real PostgreSQL barriers; do not label the race reproduced from source alone. Bounded serialization retries (max 3, jitter); no plaintext token persistence or replayable successor in logs.',
 'Backfill each old token as a family or invalidate old sessions once. Keep hashes/revocation evidence until retention expiry. Rollback cannot restore nonconditional consumption; force login if schema compatibility is uncertain.',
 ['20 simultaneous refreshes yield one successor branch and no extra active child rows.', 'Two real browser tabs recover after 409; separate device family remains valid after compromised-family revocation.', 'DB timeout/429/503 preserves recoverable client state; Arabic/English retry and terminal messages differ.'],
 ['Real database concurrency establishes the outcome, with final row assertions.', 'Family replay and benign tab races have distinct tested behavior.'], 'Identity concurrency');

task('SEC-14', 'Complete secure MFA enrollment and recovery', 'P2', 'M1', 'SEC-10 ENG-05',
 'server/src/modules/auth/mfa.controller.ts server/src/utils/totp.ts server/prisma/schema.prisma client/src/components/settings/MfaSetupModal.tsx',
 'New factor enrollment cannot disable an existing factor; secrets are encrypted and recovery/replay handling is atomic.',
 ['Backend: require recent authentication; stage pending secret until proof, atomically consume TOTP timestep, issue hashed one-use recovery codes and audited factor-reset flow.', 'Frontend: retain existing enabled state during enrollment, display backup codes once, require confirmation and safe cancellation.', 'Database: separate pending/active encrypted secrets, key version, last accepted timestep and hashed recovery-code rows.', 'Configuration/infrastructure: provision managed encryption key and rotation procedure separate from JWT secrets; redact codes/QR payloads.'],
 'POST /api/v1/auth/mfa/enroll -> {"data":{"enrollmentId":"me_1","expiresAt":"...","setupUri":"<shown once>"}}; confirm includes enrollmentId and code; replay -> 409 CODE_ALREADY_USED.',
 'Conditional TOTP race requires parallel DB proof. Re-enroll failure leaves active MFA working. Recovery code consumption uses conditional update; password proof plus rate limits required for sensitive changes.',
 'Encrypt existing secrets in a controlled migration, verify decrypt capability before replacing columns, preserve MFA enabled status. Backup encrypted keys separately; key-loss recovery requires audited verified identity, never silently disable MFA.',
 ['Reenroll/cancel/timeout keeps old factor valid; confirmed replacement invalidates it.', 'Parallel same TOTP/recovery code accepts once; unauthorized user cannot disable another factor.', 'Arabic/English keyboard enrollment/recovery browser journey and lost-key runbook drill pass.'],
 ['No plaintext factor or backup code persists.', 'Enrollment and one-use replay invariants survive restart and concurrent requests.']);

task('SEC-15', 'Keep unisolated code execution unavailable at launch', 'P1', 'M0', 'ENG-03',
 'server/src/modules/courses/playground.controller.ts server/src/modules/courses/playground.routes.ts .github/workflows/ci.yml client/src/components/editor/CodePlaygroundBlock.tsx',
 'Launch API and CI cannot execute uploaded/student code on the application host; later enablement belongs only to ENH-15.',
 ['Backend: enforce disabled capability before execution handlers; remove or make unreachable the API-host subprocess path in production.', 'Frontend: show a localized staged-feature state for existing code blocks without execute controls.', 'Database: preserve code exercises and submissions as inert content; no execution migration yet.', 'Configuration/infrastructure: remove CODE_EXECUTION_ENABLED=true from general CI, reject incompatible production execution configuration; assert no interpreter spawned in release tests.'],
 'POST /api/v1/playground/:id/execute -> 503 FEATURE_DISABLED regardless of teacher/admin role while the isolated executor is unapproved.',
 'Conditional danger exists only if enabled; record this distinction. Hidden UI is insufficient. ENH-15 must replace the trust boundary before any flag may enable execution; API process has no sandbox bypass.',
 'Do not delete saved exercises. Disable first and audit prior deployments/jobs. Rollback of unrelated changes keeps execution off; emergency capability kill switch is server-side.',
 ['Direct execute calls from every role and altered flag combinations never spawn a process.', 'General CI runs without execution enabled or interpreter access.', 'Arabic/English disabled code-block view preserves authored instructions; ENH-15 has separate gated security acceptance.'],
 ['Launch disabled API proof is recorded.', 'No claim of a fully isolated playground remains in active documentation.'], 'Platform security; ENH-15 owns future enablement');

// Domain batches and shared-document renderer are loaded below.
require('./tasks-commerce.cjs')(task);
require('./tasks-learning.cjs')(task);
require('./tasks-engineering.cjs')(task);
require('./tasks-enhancements.cjs')(task);
const { cases, writeShared } = require('./shared-docs.cjs');
for (const t of tasks) {
  t.status = statusOverrides[t.id] || 'Planned';
  t.documentPath = taskDocument(t);
  t.paths = [...new Set(t.paths.map(p => retiredRootDocs[p] || p))];
}
const link = id => `[${id}](${id}.md)`;
function taskText(t) {
  const finding = findings.get(t.id);
  const acceptance = cases.filter(c => c.tasks.includes(t.id));
  const evidence = finding ? finding.evidence.replaceAll('<D:/digital platform/', '<../../').replace(/:([0-9]+)>/g, '>') : 'Scope/enhancement request agreed on 21 October 2026. This is planned product work, not a newly reproduced defect. Current prototype context is recorded in the historical audit.';
  const refs = finding ? `[${t.id} original finding](../../audit/PRODUCT_READINESS_REVIEW.md)` : (t.id.startsWith('ENH') ? '[Revised enhancement scope](../PRODUCT_SCOPE.md)' : '[Agreed product direction](../PRODUCT_SCOPE.md)');
  return `# ${t.id} — ${t.title}

| Field | Value |
|---|---|
| Stable ID | ${t.id} |
| Priority | ${t.priority} |
| Release milestone | ${t.milestone} — ${milestoneNames[t.milestone]} |
| Status | **${t.status}** |
| Implementation owner | ${t.owner} |
| Dependencies | ${t.dependencies.length ? t.dependencies.map(link).join(', ') : 'None; start independently within the milestone gate.'} |
| Original finding / request | ${refs} |
| Original evidence classification | ${finding ? finding.title : 'Agreed scope/enhancement request; no defect reproduction claimed.'} |
| Acceptance links | ${acceptance.length ? acceptance.map(c => `[${c.id}](../AUDIT_TRACEABILITY.md#${c.id.toLowerCase()})`).join(', ') : 'Task-specific cases below; also the shared release protocol.'} |
| Release disposition | ${t.id === 'ENG-13' ? 'M0 harness/dependency subgate Complete; full-product coverage and production CI evidence remain In Progress through G3.' : t.milestone === 'M4' ? 'Post-launch; disabled at the API until this task and its enablement gate pass.' : (['SEC-15','LRN-08'].includes(t.id) ? 'Required launch containment; future enablement has a separate owning task.' : 'Required before completing this milestone; no release credit for documentation alone.')} |

${t.milestone === 'M0' ? '**M0 checkpoint evidence:** See [current verification](../CURRENT_STATUS.md), [implementation results and task disposition](../M0_IMPLEMENTATION_STATUS.md), [second-round fixes](../M0_REVIEW_ROUND_2.md), and [manual checks](../M0_MANUAL_TESTING.md). Completion refers to the internal engineering/containment deliverable. Production canaries, live rotations and G1–G3 evidence are not claimed. ENG-05 and ENG-13 keep their continuing M1/release obligations In Progress. The task scenarios/checklists below retain the full acceptance scope; an unchecked later operational scenario is not represented as executed.\n' : ''}

## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **${implementationCommit}**. ${taskUpdate(t)} The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

${evidence}

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

${t.target}

${t.owner} owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

${t.steps.map((s,i)=>`${i+1}. ${s}`).join('\n')}

Implementation locations (existing source entry points; new models/modules described above are proposed):

${t.paths.map(p=>`- [${p}](<../../${p}>)`).join('\n')}

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

\`\`\`text
${t.example}
\`\`\`

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

${t.controls}

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

${t.migration}

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

${t.tests.map((s,i)=>`- **${t.id}-T${String(i+1).padStart(2,'0')}** — ${s}`).join('\n')}
- **${t.id}-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **${t.id}-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **${t.id}-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

${t.done.map(s=>`- [ ] ${s}`).join('\n')}
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
`;
}

const archiveFiles = ['README.md','task.md','implementation_plan.md','Educational_Platform_Requirements_and_Test_Plan.md','Educational_Platform_System_Design_Document.md','project_overview_and_usage_guide.md','manual_testing_guide.md','REQUIREMENTS_COVERAGE.md','teacher.md','DEEP_DIVE_ANALYSIS_AND_ENHANCEMENTS.md','LEARNHOUSE_DEEP_DIVE_ANALYSIS.md','server/README.md','client/README.md'];
const hashes = [];
for (const p of archiveFiles) {
  const dest = 'docs/archive/' + p;
  if (!fs.existsSync(path.join(root,dest))) { fs.mkdirSync(path.dirname(path.join(root,dest)),{recursive:true}); fs.copyFileSync(path.join(root,p),path.join(root,dest)); }
  hashes.push({path:p, archive:dest, sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,dest))).digest('hex')});
}
for (const t of tasks) write(t.documentPath, rewriteLinks(taskText(t), `docs/tasks/${t.id}.md`, t.documentPath, tasks));
write('docs/task-manifest.json', JSON.stringify({schemaVersion:2,date,baseline:'2fbdc8e',implementationCommit,milestones:milestoneNames,tasks:tasks.map(t=>({...t,originalFinding:findings.has(t.id)?t.id:null,originalEvidence:findings.get(t.id)?.title||null,acceptanceCases:cases.filter(c=>c.tasks.includes(t.id)).map(c=>c.id)})),acceptanceCases:cases},null,2));
write('docs/archive/manifest.json',JSON.stringify(hashes,null,2));
writeShared({root,docs,read,write,tasks,findings,originalCases,cases,milestoneNames});
write('docs/archive/completed/README.md', `# Completed task records\n\nThese ${tasks.filter(t=>t.status==='Complete').length} task specifications are retained as historical implementation/acceptance records and excluded from the [active backlog](../../ROADMAP_BACKLOG.md). Each record is stored under its own milestone. Completion applies only to its recorded scope; production holds remain in [current status](../../CURRENT_STATUS.md).\n\n${Object.keys(milestoneNames).filter(m=>tasks.some(t=>t.milestone===m&&t.status==='Complete')).map(m=>`## ${m} — ${milestoneNames[m]}\n\n${tasks.filter(t=>t.milestone===m&&t.status==='Complete').map(t=>`- [${t.id} — ${t.title}](${m}/${t.id}.md)`).join('\n')}`).join('\n\n')}\n`);
// Keep hand-written specifications linked to the current document locations.
for (const p of fs.readdirSync(docs).filter(p=>p.endsWith('.md'))) write(`docs/${p}`, read(`docs/${p}`));
write('docs/archive/reviews/README.md', `# Historical review evidence\n\nCurrent M1 decisions are in [the M1 review](../../M1_REVIEW.md) and [release closure](../../M1_RELEASE_READINESS.md). [The final M0 review](../../M0_FINAL_REVIEW.md) records its completed engineering checkpoint. Earlier reviews retain their original findings, resolutions and evidence; their older counts and task statuses are historical.\n\n${Object.values(historicalDocMoves).map(p=>`- [${path.basename(p)}](${path.basename(p)})`).join('\n')}\n- [M1 first review and original resolution evidence](M1_REVIEW_ROUND_1.md)\n`);
// Exact known generated paths only; never remove source, uploads, or audit evidence.
for (const t of tasks.filter(t=>t.status==='Complete')) {
  const old = path.join(root, 'docs/tasks', `${t.id}.md`);
  if (fs.existsSync(old)) fs.unlinkSync(old);
}
for (const p of Object.keys(retiredRootDocs)) if (fs.existsSync(path.join(root,p))) fs.unlinkSync(path.join(root,p));
for (const p of Object.keys(historicalDocMoves)) if (fs.existsSync(path.join(root,p))) fs.unlinkSync(path.join(root,p));
console.log(`Wrote ${tasks.filter(t=>t.status!=='Complete').length} active and ${tasks.filter(t=>t.status==='Complete').length} archived task documents; removed superseded root wrappers.`);
