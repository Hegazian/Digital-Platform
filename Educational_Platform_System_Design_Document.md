# System design

**Updated: 22 October 2026**, M0 application checkpoint **d9c720f**. M0 engineering is finalized for internal synthetic data; G1–G3 and production onboarding remain gated by operator evidence. See [current results and remaining gaps](docs/CURRENT_STATUS.md). ENG-05 and ENG-06 code and exact-head CI passed; their representative restore and infrastructure rehearsals remain open. M1 implementation starts with dependency-ready ENG-09. See the [current M1 handoff](docs/NEXT_STEPS.md). Previous content is [superseded and preserved](docs/archive/Educational_Platform_System_Design_Document.md).

Use the [target architecture](docs/TARGET_ARCHITECTURE.md), [shared API/data contracts](docs/API_DATA_CONTRACTS.md) and [operations design](docs/MIGRATION_OPERATIONS.md). Course -> Module/Unit -> Lesson -> ordered typed blocks is canonical. Immutable published revisions and versioned attempts preserve learning history.

The prior design is superseded. Background workers process uploaded files and durable delivery jobs; they do not generate educational material. Private asset IDs, shared access policy, EGP ledger and server capability enforcement are required boundaries.
