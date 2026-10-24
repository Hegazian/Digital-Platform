ALTER TABLE "courses"
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "retractedAt" TIMESTAMP(3),
  ADD COLUMN "retractionReason" TEXT,
  ADD COLUMN "retractedById" TEXT;

CREATE INDEX "courses_isPublished_visibility_status_idx"
  ON "courses"("isPublished", "visibility", "status");
CREATE INDEX "courses_retractedAt_idx" ON "courses"("retractedAt");
ALTER TABLE "courses"
  ADD CONSTRAINT "courses_retractedById_fkey"
  FOREIGN KEY ("retractedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
