ALTER TABLE "refresh_tokens"
  ADD COLUMN "familyId" TEXT,
  ADD COLUMN "parentTokenId" TEXT,
  ADD COLUMN "consumedAt" TIMESTAMP(3);

-- Existing sessions remain valid and each starts as its own independently
-- revocable family. New code supplies familyId on creation.
UPDATE "refresh_tokens" SET "familyId" = "id" WHERE "familyId" IS NULL;

CREATE UNIQUE INDEX "refresh_tokens_parentTokenId_key"
  ON "refresh_tokens"("parentTokenId");
