# Manual verification guide

**Current direction: 21 October 2026.** M0 engineering is finalized for internal synthetic data; production onboarding remains gated by G1–G3 and operator verification. See [M0 implementation status](docs/M0_IMPLEMENTATION_STATUS.md). Previous content is [superseded and preserved](docs/archive/manual_testing_guide.md).

Start with the [step-by-step M0 manual guide](docs/M0_MANUAL_TESTING.md) and [review resolutions](docs/M0_REVIEW_RESOLUTION.md). Follow [testing and release gates](docs/TESTING_RELEASE_GATES.md), [42-case mapping](docs/AUDIT_TRACEABILITY.md) and each owning task’s named tests. Use dedicated deterministic student A/B, approved teacher A/B, pending/rejected teacher and admin fixtures.

Required browser journeys include human author/import/review/publish, private preview/paid delivery, objective/manual grading, assignment upload, progress recovery, manual checkout/voucher and full Arabic/English flows. Test direct APIs as well as hidden UI. Do not run legacy destructive cleanup against a non-test database or count skipped/permissive browser assertions as passing.
