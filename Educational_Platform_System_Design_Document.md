# System design

**Updated: 22 October 2026**, M0 application checkpoint **d9c720f**. M0 engineering is finalized for internal synthetic data; production onboarding remains gated by G1–G3 and operator verification. See [current results and remaining gaps](docs/CURRENT_STATUS.md). ENG-05's migration chain and populated fixture pass locally; **complete remote CI and backup/restore review** before moving to dependent M1 work. See the [ENG-05 evidence and plan](docs/NEXT_STEPS.md#first-implementation-task--eng-05). Previous content is [superseded and preserved](docs/archive/Educational_Platform_System_Design_Document.md).

Use the [target architecture](docs/TARGET_ARCHITECTURE.md), [shared API/data contracts](docs/API_DATA_CONTRACTS.md) and [operations design](docs/MIGRATION_OPERATIONS.md). Course -> Module/Unit -> Lesson -> ordered typed blocks is canonical. Immutable published revisions and versioned attempts preserve learning history.

The prior design is superseded. Background workers process uploaded files and durable delivery jobs; they do not generate educational material. Private asset IDs, shared access policy, EGP ledger and server capability enforcement are required boundaries.
