# M0 follow-up review resolution

The read-only review against baseline `2fbdc8e65a5bd5c33f749ed04b65155e9e06e1e2` identified five introduced regressions. All five are fixed in this branch. They extend existing owning tasks instead of creating duplicate task engines.

| Review finding | Implementation / owner | Regression evidence |
|---|---|---|
| R01: unbound assignment `this` calls | Assignment responses call protection helpers through `AssignmentController`; SEC-02 | `assignment.http.spec.ts` exercises detail/list/update, upload/submit and grading through Express |
| R02: incompatible attachment validators | The schema/service share one relative upload-path contract, with a signed uploader-bound token and server-trusted metadata; SEC-02/03 | HTTP upload-to-submit succeeds; cross-student reuse, traversal and missing/invalid references are denied |
| R03: unauthenticated links/iframes | Refresh-aware authenticated blob delivery, temporary URL cleanup, safe MIME handling and shared download controls; SEC-02 | HTTP byte delivery/denial, client PDF/blob tests, actual English/Arabic desktop/mobile PDF and assignment journeys |
| R04: empty curriculum after enrollment/access grant | Both enrollment and verified-checkout callbacks reload the protected curriculum; SEC-04 | Component tests for both grants; actual first-enrollment browser journeys |
| R05: expired playback URLs without renewal | API expiry metadata, automatic renewal, cancellation of stale lesson requests and restoration of paused position/speed; SEC-02 | Hook tests for renewal/denial/races; actual WebM playback renewal on desktop and mobile |

Related verification also repaired production startup's unnecessary gateway-secret requirement, rejected weak dedicated stream keys, added a private-bucket startup gate, corrected hidden-directory protected downloads and WebM delivery MIME, stripped arbitrary answer flags from assessment option JSON, and restored persisted Arabic state after hydration. These are included in the M0 evidence; no application-host code runner or AI feature was enabled.

The final commands, coverage limits and deployment holds are recorded in [M0 implementation status](M0_IMPLEMENTATION_STATUS.md). The [manual testing guide](M0_MANUAL_TESTING.md) provides the reproduction steps.
