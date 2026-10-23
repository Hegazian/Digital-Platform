# LRN-16 — Complete Arabic/English interface and uploader-supplied locales

| Field | Value |
|---|---|
| Stable ID | LRN-16 |
| Priority | P1 |
| Release milestone | M2 — Authoring and learning |
| Status | **Planned** |
| Implementation owner | Internationalization and content locale owner |
| Dependencies | [ENH-02](ENH-02.md), [ENH-01](ENH-01.md) |
| Original finding / request | [LRN-16 original finding](../../audit/PRODUCT_READINESS_REVIEW.md) |
| Original evidence classification | P1 / S/G |
| Acceptance links | [A32](../AUDIT_TRACEABILITY.md#a32), [A42](../AUDIT_TRACEABILITY.md#a42) |
| Release disposition | Required before completing this milestone; no release credit for documentation alone. |



## Current delivery and next action

Updated **23 October 2026** against reviewed M0 application commit **34723cd**. M0 repaired persisted Arabic hydration and mobile profile/logout overlap; the expanded desktop/mobile smoke suite passes. Full Arabic/English labels, authoring/assessment/payment flows, keyboard/screen-reader and actual-device acceptance remain planned. Status changes require new task-specific evidence; the documentation refresh alone does not complete implementation. The [remaining execution plan](../NEXT_STEPS.md) orders future work; this document's intended contracts and unchecked scenarios are implementation requirements, not claims of deployed behavior.

## Current behavior and evidence

**Original audit/request context; later implementation is recorded above.**

Arabic support is partial: core player, quizzes, board, AI errors, catalog title, and many management controls contain English-only text. Persisted Arabic/RTL state does not rerun `setLang` on hydration; the root remains `lang="en"` unless toggled. There is no `/ar`/`/en` URL or server-rendered locale metadata. Quiz question text, lesson body, and many descriptions have one language field.

The quoted finding is historical evidence tied to baseline commit **2fbdc8e**, 21 October 2026; the current-delivery section above records later changes. R means a local fixture/double reproduction, S source/compiler evidence, C conditional risk and G incomplete capability. Conditional claims require the verification below before reporting a reproduced production defect. See the [baseline and limits](../TESTING_RELEASE_GATES.md#baseline-evidence).

## Intended behavior and ownership boundary

Every launch interface flow supports ar/en with stable server locale; educational content declares AR/EN/BILINGUAL and translations are supplied by uploaders.

Internationalization and content locale owner owns this change. Shared implementation must use the owning tasks in the [ownership register](../TARGET_ARCHITECTURE.md#implementation-ownership); dependent tasks adapt their domain and add regression evidence, rather than build a second policy/engine. All interface changes follow [API contracts](../API_DATA_CONTRACTS.md). Exclusions: automatic educational creation/translation/narration/captions, unrelated feature enablement and destructive historical-data cleanup. A production rollout is separate from this documentation deliverable.

## Ordered implementation changes

1. Backend: localized validation message keys and typed LocaleText; publication enforces course-language completeness, never auto-translates.
2. Frontend: central message catalogs, /ar and /en route locale, server html.lang/dir, safe persisted preference migration and logical CSS; localize student/admin/teacher/payment/recovery flows.
3. Database: add course contentLanguage/defaultContentLocale and versioned translations per field/block/question; preserve original single-language text with explicit provenance.
4. Configuration/infrastructure: default interface ar, locale URL is authoritative, cookie preference aids redirects; configure Intl Africa/Cairo and EGP formatting, readable mixed-direction math/code.
5. Accessibility: keyboard/focus/labels/error summaries and screen-reader reading order tested in both languages; ENH-07 owns captions/transcript-specific presentation.

Implementation locations (existing source entry points; new models/modules described above are proposed):

- [client/src/app/layout.tsx](<../../client/src/app/layout.tsx>)
- [client/src/lib/store.ts](<../../client/src/lib/store.ts>)
- [client/src/lib/useT.ts](<../../client/src/lib/useT.ts>)
- [client/src/components/VideoPlayerSection.tsx](<../../client/src/components/VideoPlayerSection.tsx>)
- [client/src/components/player/InteractiveQuizRunner.tsx](<../../client/src/components/player/InteractiveQuizRunner.tsx>)
- [server/prisma/schema.prisma](<../../server/prisma/schema.prisma>)

## API, type and schema contract

Concrete intended boundary example (IDs and dates are illustrative, not production fixtures):

```text
Course={"contentLanguage":"BILINGUAL","defaultContentLocale":"ar","title":{"ar":"الرياضيات","en":"Mathematics"}}; AR course may omit English teaching body while interface remains fully translated.
```

Apply strict body/query/param schemas, bounded arrays/strings, UUID/cuid formats matching actual IDs, cross-resource relationship checks and UTC ISO instants. Return the C01 error envelope with stable code/messageKey/requestId; do not echo secrets. Money is integer EGP piastres, not a floating charge. Locale text is uploader-provided and never synthesized. Exact shared DTO fields and validation rules are normative in the [contract register](../API_DATA_CONTRACTS.md#contract-register); this example does not create an alternate envelope.

## Authorization, concurrency and failure handling

Interface locale never changes account identity, authorization or exam deadlines. BILINGUAL publication requires both declared variants of required fields/assets; monolingual content has an explicit language badge/fallback to supplied primary text.

Commands validate the current actor at execution time. Repeated mutations use the owning contract's scoped idempotency or expected version; stale edits return 409/412 rather than silently overwrite. Retry only retryable infrastructure/serialization failures with bounded backoff, never validation/authorization failures. A durable write must not report success from process memory. Record request/entity/actor IDs and safe error codes, with no credentials, answer keys, student bodies or signed URLs in logs. Operations must expose stalled work for manual recovery.

## Migration, compatibility and rollback

Do not label English text as Arabic automatically. Backfill original text under verified language or admin-review UNKNOWN until set; retain originals and existing course URLs through locale redirects. Hydration cannot overwrite URL locale.

Follow [expand/backfill/verify/cutover](../MIGRATION_OPERATIONS.md): snapshot affected data, count/checksum before and after, retain old IDs/history and test on a representative copy. Reversible code rollback must retain security guards and compatible schema; use a forward fix once new data exists. Do not roll back to public files, leaked keys, permissive authorization or an enabled staged feature.

## Verification and acceptance tests

- **LRN-16-T01** — Persist Arabic then reload: html.lang=ar/dir=rtl from first render; /en sets en/ltr and formatting.
- **LRN-16-T02** — Registration→catalog→manual checkout→lesson→assessment→assignment→results and teacher/admin review complete in both locales.
- **LRN-16-T03** — Missing translation, long Arabic names, mixed math/numerals, keyboard/mobile browser and locale/account switches behave correctly.
- **LRN-16-T90 / cross-account** — Execute the positive operation as its permitted actor, then repeat with student B, teacher B, a pending/rejected teacher and guest as applicable; assert the intended safe DTO/denial and no unauthorized durable side effects. For documentation/build-only work, verify no fixture credentials or false capability claims replace this runtime check.
- **LRN-16-T91 / concurrency and recovery** — Overlap the relevant command/read with retry, stale version, access revocation or process restart; assert final persisted state and one intended effect. Read-only/documentation work instead checks deterministic output and link/contract consistency. Use real PostgreSQL barriers for transaction claims; mocks do not prove them.
- **LRN-16-T92 / Arabic, English and browser** — Exercise affected views in both interface locales after reload, with correct lang/dir, formatting, keyboard focus and localized failures. For backend-only/config tasks, cover API locale/error keys and the consuming smoke journey; no new UI is required just to satisfy a test label.

Observable acceptance:

- [ ] A32 full journeys and A42 reading order pass.
- [ ] No active task assumes generated translations or captions.
- [ ] Applicable positive, negative, cross-account, concurrency/retry and Arabic/English browser tests above pass without skips; mark any genuinely inapplicable dimension with a written rationale.
- [ ] Migration/compatibility and rollback are rehearsed with preserved historical records, or explicitly recorded as no-data-change.
- [ ] API/types/docs and dependency consumers agree; owning task is linked and no duplicate engine is introduced.
- [ ] Attach exact commit, environment, commands, test IDs/results and operational evidence; update backlog status only after review. Existing baseline passes do not complete this task.
