import { Router } from "express";
import { getAppConfig, updateAppConfig } from "./config.controller";
import { authenticate, requireRole } from "../auth/auth.middleware";
import { Role } from "@prisma/client";

const router = Router();

// Publicly available config for the frontend to consume
router.get("/", getAppConfig);

// Admin-only route to update config (supports both PUT and PATCH)
router.put("/", authenticate, requireRole([Role.ADMIN]), updateAppConfig);
router.patch("/", authenticate, requireRole([Role.ADMIN]), updateAppConfig);

export default router;
