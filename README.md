# Educational platform for Egyptian students

**Updated: 22 October 2026**, M0 application checkpoint **d9c720f**. M0 engineering is finalized for internal synthetic data; production onboarding remains gated by G1–G3 and operator verification. See [current results and remaining gaps](docs/CURRENT_STATUS.md). ENG-05's migration chain, populated fixture and remote CI pass; representative backup/restore review remains before dependent schema release. ENG-06 reliability work is underway. See the [ENG-05 evidence and plan](docs/NEXT_STEPS.md#first-implementation-task--eng-05). Previous content is [superseded and preserved](docs/archive/README.md).

A bilingual educational platform for Egyptian students across all school stages. Admins and approved teachers provide content through uploads, structured imports and manual editors. The platform reviews, publishes, protects and presents that content, manages assessments and progress, and controls enrollment and paid access.

Educational content creation belongs to uploaders. AI tutoring, generation and provider integrations are outside the revised product scope; the tutor interface, route, provider dependency and key configuration have been removed. Technical validation/scanning/transcoding/thumbnail processing of supplied files is permitted. Arabic/English interface support is required; uploader-supplied courses may be Arabic, English or bilingual.

Start with [the implementation documentation](docs/README.md), [all 77 tasks](docs/ROADMAP_BACKLOG.md), [scope](docs/PRODUCT_SCOPE.md), [target architecture](docs/TARGET_ARCHITECTURE.md), [contracts](docs/API_DATA_CONTRACTS.md), [audit mapping](docs/AUDIT_TRACEABILITY.md), [release gates](docs/TESTING_RELEASE_GATES.md) and [operations](docs/MIGRATION_OPERATIONS.md).

The repository uses Next.js/React in client and Express/Prisma/PostgreSQL in server with existing JWT authentication. M0 implements protected local files and a private-Supabase production startup guard. The managed media library and separate processing/delivery workers remain later milestones. Supabase Auth is not introduced.

Launch targets free enrollment, verified manual payments and vouchers in EGP. Teacher content/revisions require admin approval; admins may publish their own content. Automated gateways, guardian portal, certificates, offline packs, collaboration, isolated execution and developer integrations stay server-disabled until their individual gates pass.

For setup and verification see the [M0 manual guide](docs/M0_MANUAL_TESTING.md), [usage](project_overview_and_usage_guide.md), [server guide](server/README.md) and [client guide](client/README.md). The [second review round](docs/M0_REVIEW_ROUND_2.md) records the latest dashboard, session, mobile and delivery fixes/tests. [M0 implementation status](docs/M0_IMPLEMENTATION_STATUS.md) preserves the earlier checkpoint and production holds. The original review's 108-test sample, build blocker and unvalidated integration are historical baselines.

No whole-repository license is asserted by this README: the former MIT badge was unsupported and current source metadata is private/UNLICENSED. Owner approval and an explicit license file are required before public source distribution.
