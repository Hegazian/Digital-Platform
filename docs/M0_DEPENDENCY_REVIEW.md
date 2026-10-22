# M0 dependency decision record

Reviewed **21 October 2026**. Exact lockfile hashes, counts, paths and expiry are in [dependency verification](../audit/m0/dependency-verification.json), with [server](../audit/m0/server-audit.json) and [client](../audit/m0/client-audit.json) reports. Reproduce using `node docs/scripts/audit-dependencies.cjs` from the repository root; an unavailable advisory service is an error.

Refreshed **22 October 2026** during the [second review round](M0_REVIEW_ROUND_2.md), with explicit user authorization for NPM metadata transfer. Lockfiles are unchanged; the policy still passes with zero runtime advisory packages and the same nine development-only exceptions.

This evidence is included at application checkpoint **d9c720f** and summarized in [current status](CURRENT_STATUS.md). The [next-steps plan](NEXT_STEPS.md) keeps remediation under ENG-13, due before paid release or **19 January 2027**, whichever comes first. A documentation refresh does not constitute another advisory scan.

## Runtime remediation

- Next.js **14.2.35 → 16.4.2**, React/React DOM **19.3.1**, and Tiptap **3.32.0** address the runtime framework/editor advisories. Existing lesson content is preserved; the editor uses explicit deferred browser rendering. The migration follows the official [Next 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) and [Tiptap v2-to-v3 guide](https://tiptap.dev/docs/guides/upgrade-tiptap-v2).
- Morgan **1.12.1**, Multer **2.4.0**, proxy-addr **2.0.8** and qs **6.16.1** replace the affected server runtime paths. Unused Nodemon was removed; the server development command already uses tsx.
- Next 16 uses a separate ESLint CLI gate. Typechecking, lint, builds, component tests and the actual API/DB browser journeys are run explicitly; build success does not substitute for lint.

The captured reports show **zero runtime advisory packages** for both applications and zero total server advisories. This statement is tied to those lockfiles/report date, not a permanent guarantee.

## Development-only exceptions

Nine client advisory packages remain in repository-controlled CSS/lint tooling, rooted in two advisory IDs: [braces recursion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [selector-parser complexity](https://github.com/advisories/GHSA-rj75-hqrm-r3gf). Their transitive effects and exact paths are recorded in the report. They process trusted repository globs/selectors during development/build; uploaded educational content is not passed to that pipeline.

[dependency-exceptions.json](dependency-exceptions.json) assigns ENG-13 ownership and expires on **19 January 2027**. Resolve through the reviewed CSS/lint toolchain work before the paid release or expiry, whichever is earlier. The audit gate verifies every affected lockfile node is development-only, every package and advisory ID matches the explicit exception, and the expiry has not passed. A newly affected runtime path, additional advisory or expired exception fails CI. No runtime advisory is exempted.

## Scope of completion

M0 establishes the isolated test harness and precise dependency triage. Whole-source coverage is published for both packages. G0 enforces the backend regression floor and stricter authorization/upload-token coverage, plus coverage for the new client delivery/playback modules. The unchanged G3 target of **80% statements/lines/functions and 75% branches over the full production source** is available through `npm run test:coverage:release` in both packages and is still unmet. The low whole-client percentage is reported explicitly; the M0 component tests do not establish complete frontend feature coverage.
