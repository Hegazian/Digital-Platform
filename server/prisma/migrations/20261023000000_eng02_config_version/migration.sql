-- Add an optimistic concurrency token for admin configuration updates.
-- Existing settings remain unchanged and receive the initial version 1.
ALTER TABLE "app_configs"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Older prototypes exposed other display currencies, but all platform charges
-- and checkout records are denominated in EGP.
UPDATE "app_configs" SET "currency" = 'EGP' WHERE "currency" <> 'EGP';
