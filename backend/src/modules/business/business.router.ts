import { Router } from "express";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { businessController } from "./business.controller.js";

export const businessRouter = Router();

businessRouter.get("/me", businessController.getCurrent);
businessRouter.put("/me", requireRole("OWNER", "ADMIN"), businessController.updateCurrent);
businessRouter.get("/me/hours", businessController.getHours);
businessRouter.put("/me/hours", requireRole("OWNER", "ADMIN"), businessController.updateHours);