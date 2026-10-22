# Manual verification guide

**Updated: 22 October 2026**, application checkpoint **d9c720f**. M0 engineering is finalized for internal synthetic data; production onboarding remains gated by G1–G3 and operator verification. See [current results and remaining gaps](docs/CURRENT_STATUS.md). **Next: [ENG-05 migration baseline](docs/NEXT_STEPS.md#first-implementation-task--eng-05)**, then the ordered M1 waves while ENG-13 continues testing. Previous content is [superseded and preserved](docs/archive/manual_testing_guide.md).

Start with the [step-by-step M0 manual guide](docs/M0_MANUAL_TESTING.md) and [review resolutions](docs/M0_REVIEW_RESOLUTION.md). Follow [testing and release gates](docs/TESTING_RELEASE_GATES.md), [42-case mapping](docs/AUDIT_TRACEABILITY.md) and each owning task’s named tests. Use dedicated deterministic student A/B, approved teacher A/B, pending/rejected teacher and admin fixtures.

Required browser journeys include human author/import/review/publish, private preview/paid delivery, objective/manual grading, assignment upload, progress recovery, manual checkout/voucher and full Arabic/English flows. Test direct APIs as well as hidden UI. Do not run legacy destructive cleanup against a non-test database or count skipped/permissive browser assertions as passing.
