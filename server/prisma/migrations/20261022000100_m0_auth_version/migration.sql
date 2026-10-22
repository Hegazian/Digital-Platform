-- M0 expand-only upgrade for an existing prototype database.
-- Take a backup first. Keep this column when rolling back application code.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "authVersion" INTEGER NOT NULL DEFAULT 1;
-- Retire pre-M0 sessions once, including databases that received an early default-0 build.
UPDATE "users" SET "authVersion" = 1 WHERE "authVersion" = 0;
ALTER TABLE "users" ALTER COLUMN "authVersion" SET DEFAULT 1;
