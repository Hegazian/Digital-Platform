# Educational platform for Egyptian students

**Updated: 23 October 2026**, historical M0 application checkpoint **34723cd**. M0 engineering is finalized for internal synthetic data. M1/G1 is not release ready: [release closure](docs/M1_RELEASE_READINESS.md) lists all unfinished M1 tasks, current review findings and external acceptance holds. [Current results](docs/CURRENT_STATUS.md), [the latest task review](docs/M1_PROGRESS_REVIEW.md) and [implementation order](docs/NEXT_STEPS.md) identify the verified work and remaining requirements. Current execution uses local fixtures only; G1–G3 and production onboarding remain gated. Previous content is [superseded and preserved](docs/archive/README.md).

A bilingual educational platform for Egyptian students across all school stages. Admins and approved teachers provide content through uploads, structured imports and manual editors. The platform reviews, publishes, protects and presents that content, manages assessments and progress, and controls enrollment and paid access.

Educational content creation belongs to uploaders. AI tutoring, generation and provider integrations are outside the revised product scope; the tutor interface, route, provider dependency and key configuration have been removed. Technical validation/scanning/transcoding/thumbnail processing of supplied files is permitted. Arabic/English interface support is required; uploader-supplied courses may be Arabic, English or bilingual.

Start with [the implementation documentation](docs/README.md), [all 77 tasks](docs/ROADMAP_BACKLOG.md), [scope](docs/PRODUCT_SCOPE.md), [target architecture](docs/TARGET_ARCHITECTURE.md), [contracts](docs/API_DATA_CONTRACTS.md), [audit mapping](docs/AUDIT_TRACEABILITY.md), [release gates](docs/TESTING_RELEASE_GATES.md) and [operations](docs/MIGRATION_OPERATIONS.md).

The repository uses Next.js/React in client and Express/Prisma/PostgreSQL in server with existing JWT authentication. M0 implements protected local files and a private-Supabase production startup guard. Managed media and separate processing/delivery workers remain planned M1 work. Supabase Auth is not introduced.

Launch targets free enrollment, verified manual payments and vouchers in EGP. Teacher content/revisions require admin approval; admins may publish their own content. Automated gateways, guardian portal, certificates, offline packs, collaboration, isolated execution and developer integrations stay server-disabled until their individual gates pass.

For setup and verification see the [M0 manual guide](docs/M0_MANUAL_TESTING.md), [usage](docs/README.md), [server guide](server/README.md) and [client guide](client/README.md). The [final review](docs/M0_FINAL_REVIEW.md) records the reviewed integration, fixes and current evidence. [M0 implementation status](docs/archive/reviews/M0_IMPLEMENTATION_STATUS.md) preserves the earlier checkpoint; current production holds are in [operations](docs/MIGRATION_OPERATIONS.md#m0-upgrade-and-production-hold). The original review's 108-test sample, build blocker and unvalidated integration are historical baselines.

No whole-repository license is asserted by this README: the former MIT badge was unsupported and current source metadata is private/UNLICENSED. Owner approval and an explicit license file are required before public source distribution.
