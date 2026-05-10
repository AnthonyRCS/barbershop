import { Router } from "express";
import { requirePlatformRole } from "../../middleware/platform-rbac.middleware.js";
import { platformBusinessesController } from "./platform-businesses.controller.js";

export const platformBusinessesRouter = Router();

platformBusinessesRouter.get("/", platformBusinessesController.list);
platformBusinessesRouter.get("/:id", platformBusinessesController.getById);
platformBusinessesRouter.patch("/:id", requirePlatformRole("SUPERADMIN", "SUPPORT"), platformBusinessesController.update);
platformBusinessesRouter.patch("/:id/status", requirePlatformRole("SUPERADMIN"), platformBusinessesController.changeStatus);
platformBusinessesRouter.patch("/:id/plan", requirePlatformRole("SUPERADMIN"), platformBusinessesController.changePlan);
