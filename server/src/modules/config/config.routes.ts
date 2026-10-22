import { Router } from "express";
import { z } from "zod";
import { getAppConfig, updateAppConfig } from "./config.controller";
import { authenticate, requireRole } from "../auth/auth.middleware";
import { Role } from "@prisma/client";
import { validateBody } from "../../utils/validate";

const makeJsonValueSchema = (depth = 0): z.ZodType<unknown> => {
  const primitives = [z.string().max(10_000), z.number().finite(), z.boolean(), z.null()] as const;
  if (depth >= 12) return z.union(primitives);
  return z.lazy(() => z.union([
    ...primitives,
    z.array(makeJsonValueSchema(depth + 1)).max(100),
    z.record(z.string().max(64), makeJsonValueSchema(depth + 1)).refine((value) => Object.keys(value).length <= 100),
  ]));
};
const jsonValueSchema = makeJsonValueSchema();

const homeContentSchema = z.record(z.string().max(64), jsonValueSchema)
  .refine((value) => Object.keys(value).length <= 100)
  .refine((value) => JSON.stringify(value).length <= 100_000, 'homeContent exceeds the 100 KB limit');

const updateAppConfigSchema = z.object({
  siteNameEn: z.string().min(1).max(60).optional(),
  siteNameAr: z.string().min(1).max(60).optional(),
  siteDescriptionEn: z.string().max(300).nullable().optional(),
  siteDescriptionAr: z.string().max(300).nullable().optional(),
  sloganEn: z.string().max(160).nullable().optional(),
  sloganAr: z.string().max(160).nullable().optional(),
  hostDomain: z.string().max(200).optional(),
  supportEmail: z.string().email().optional(),
  currency: z.string().min(1).max(8).optional(),
  exchangeRateUsdToEgp: z.coerce.number().positive().max(1_000_000).optional(),
  requireCourseApproval: z.boolean().optional(),
  allowTeacherRegistration: z.boolean().optional(),
  enableCodePlaygrounds: z.boolean().optional(),
  enableCollaborativeBoards: z.boolean().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  homeContent: homeContentSchema.optional(),
});

const router = Router();

// Publicly available config for the frontend to consume
router.get("/", getAppConfig);

// Admin-only route to update config (supports both PUT and PATCH)
router.put("/", authenticate, requireRole([Role.ADMIN]), validateBody(updateAppConfigSchema), updateAppConfig);
router.patch("/", authenticate, requireRole([Role.ADMIN]), validateBody(updateAppConfigSchema), updateAppConfig);

export default router;
