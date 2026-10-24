ALTER TABLE "quizzes" ADD COLUMN "creatorId" TEXT;
CREATE INDEX "quizzes_creatorId_idx" ON "quizzes"("creatorId");
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "question_pools" ADD COLUMN "creatorId" TEXT;
CREATE INDEX "question_pools_creatorId_idx" ON "question_pools"("creatorId");
ALTER TABLE "question_pools" ADD CONSTRAINT "question_pools_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
