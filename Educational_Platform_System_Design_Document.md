# System design

**Current direction: 21 October 2026.** M0 engineering is finalized for internal synthetic data; production onboarding remains gated by G1–G3 and operator verification. See [M0 implementation status](docs/M0_IMPLEMENTATION_STATUS.md). Previous content is [superseded and preserved](docs/archive/Educational_Platform_System_Design_Document.md).

Use the [target architecture](docs/TARGET_ARCHITECTURE.md), [shared API/data contracts](docs/API_DATA_CONTRACTS.md) and [operations design](docs/MIGRATION_OPERATIONS.md). Course -> Module/Unit -> Lesson -> ordered typed blocks is canonical. Immutable published revisions and versioned attempts preserve learning history.

The prior design is superseded. Background workers process uploaded files and durable delivery jobs; they do not generate educational material. Private asset IDs, shared access policy, EGP ledger and server capability enforcement are required boundaries.
