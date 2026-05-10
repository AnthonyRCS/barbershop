import { Router } from "express";
import { requirePlatformRole } from "../../middleware/platform-rbac.middleware.js";
import { platformSubscriptionsController } from "./platform-subscriptions.controller.js";

export const platformSubscriptionsRouter = Router();

platformSubscriptionsRouter.get("/", platformSubscriptionsController.list);
platformSubscriptionsRouter.get("/:id", platformSubscriptionsController.getById);
platformSubscriptionsRouter.patch("/:id", requirePlatformRole("SUPERADMIN", "FINANCE"), platformSubscriptionsController.update);
platformSubscriptionsRouter.patch("/:id/status", requirePlatformRole("SUPERADMIN", "FINANCE"), platformSubscriptionsController.changeStatus);
