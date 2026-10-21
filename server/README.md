# API server — prototype and planned architecture

**Current direction: 21 October 2026.** M0 engineering is finalized for internal synthetic data; production onboarding remains gated by G1–G3 and operator verification. See [M0 implementation status](../docs/M0_IMPLEMENTATION_STATUS.md). Previous content is [superseded and preserved](../docs/archive/server/README.md).

Express/Prisma/PostgreSQL modular monolith with existing JWT/refresh-session authentication. [Current scope](../docs/PRODUCT_SCOPE.md), [contracts](../docs/API_DATA_CONTRACTS.md), [tasks](../docs/ROADMAP_BACKLOG.md), [test safety](../docs/TESTING_RELEASE_GATES.md) and [operations](../docs/MIGRATION_OPERATIONS.md) are authoritative.

Existing commands: npm ci; npm run dev; npm run typecheck; npm run build; npm test. Prisma generation precedes compilation. DATABASE_URL and DIRECT_URL must be separate correctly configured runtime/migration connections; tests require an isolated allowlisted test target. Do not run the existing privileged seed on live data. Current local checks and remaining release gates are in [M0 implementation status](../docs/M0_IMPLEMENTATION_STATUS.md).

Protected local delivery and the private-production-bucket startup guard are implemented. The managed media library, migration baseline, durable workers and full shared access policy remain M1–M3 work. The prototype AI module/key/SDK have been removed under SCOPE-02. No Supabase Auth migration is planned. Automated gateways and API-host code execution must remain disabled. The package is private/UNLICENSED; public source distribution still requires an owner-approved license.
