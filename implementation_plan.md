# Implementation plan

**Current direction: 21 October 2026.** M0 engineering is finalized for internal synthetic data; production onboarding remains gated by G1–G3 and operator verification. See [M0 implementation status](docs/M0_IMPLEMENTATION_STATUS.md). Previous content is [superseded and preserved](docs/archive/implementation_plan.md).

The former parity/microservice/AI schedule is **superseded**. The current plan is [five milestones and ordered dependencies](docs/ROADMAP_BACKLOG.md): M0 safety/scope, M1 durable content foundations, M2 authoring/learning, M3 manual paid release and operations, M4 separately gated enhancements.

Use [target architecture](docs/TARGET_ARCHITECTURE.md), [contracts](docs/API_DATA_CONTRACTS.md), [migration/rollback](docs/MIGRATION_OPERATIONS.md) and [release gates](docs/TESTING_RELEASE_GATES.md). Retain the modular monolith and existing auth; do not implement AI generation or a Supabase Auth migration. Completion is evidence-based, not tied to the old dated estimates.
