import { Router } from "express";
import { requirePlatformRole } from "../../middleware/platform-rbac.middleware.js";
import { platformPlansController } from "./platform-plans.controller.js";

export const platformPlansRouter = Router();

platformPlansRouter.get("/", platformPlansController.list);
platformPlansRouter.post("/", requirePlatformRole("SUPERADMIN"), platformPlansController.create);
platformPlansRouter.patch("/:id", requirePlatformRole("SUPERADMIN"), platformPlansController.update);
platformPlansRouter.patch("/:id/toggle", requirePlatformRole("SUPERADMIN"), platformPlansController.toggle);
