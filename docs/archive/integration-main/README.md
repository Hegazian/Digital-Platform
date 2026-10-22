# Main integration provenance

Source: `origin/main` at **f175fcd0c79041747561859aee9dce741771d02f** (PR #2). The user explicitly selected the approved milestone architecture and preservation of existing data/models.

The eight guides in this directory describe the alternative simplification and are superseded by [current scope](../../PRODUCT_SCOPE.md), [architecture](../../TARGET_ARCHITECTURE.md), [contracts](../../API_DATA_CONTRACTS.md) and [the final integration review](../../M0_FINAL_REVIEW.md). Their original bytes are retained; the [manifest](manifest.json) records source paths and SHA-256 values.

The competing initial SQL is preserved verbatim at [main-0001-init.sql](../../../server/prisma/fixtures/main-0001-init.sql). It is a historical fixture, outside the executable migrations directory. Do not run it on existing tables or alongside the reviewed baseline. If an installation already recorded `0001_init`, stop automated adoption, compare a verified restored copy with both schema histories, and obtain a reviewed reconciliation plan before migration-history resolution. Never infer compatibility from the migration name.

The integration retains existing CourseModule, assessment, collection, career, board/playground and developer history. Incompatible schema/UI reductions are deferred to the relevant milestone owners with preservation tests. Compatible notifications, MFA profile access, pricing/checkout presentation, live-link input and regression tests are retained. Contained advanced features remain denied at server boundaries.
