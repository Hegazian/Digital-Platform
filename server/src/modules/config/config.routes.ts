import { Router } from "express";
import { z } from "zod";
import { getAppConfig, updateAppConfig } from "./config.controller";
import { authenticate, requireRole } from "../auth/auth.middleware";
import { Role } from "@prisma/client";
import { validateBody } from "../../utils/validate";

const updateAppConfigSchema = z.object({
  siteNameEn: z.string().min(1).max(60).optional(),
  siteNameAr: z.string().min(1).max(60).optional(),
  siteDescriptionEn: z.string().max(300).optional(),
  siteDescriptionAr: z.string().max(300).optional(),
  sloganEn: z.string().max(160).optional(),
  sloganAr: z.string().max(160).optional(),
  hostDomain: z.string().max(200).optional(),
  supportEmail: z.string().email().optional(),
  currency: z.string().min(1).max(8).optional(),
  requireCourseApproval: z.boolean().optional(),
  allowTeacherRegistration: z.boolean().optional(),
  enableCodePlaygrounds: z.boolean().optional(),
  enableCollaborativeBoards: z.boolean().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
});

const router = Router();

// Publicly available config for the frontend to consume
router.get("/", getAppConfig);

// Admin-only route to update config (supports both PUT and PATCH)
router.put("/", authenticate, requireRole([Role.ADMIN]), validateBody(updateAppConfigSchema), updateAppConfig);
router.patch("/", authenticate, requireRole([Role.ADMIN]), validateBody(updateAppConfigSchema), updateAppConfig);

export default router;
