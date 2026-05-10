import { Router } from "express";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { barbersController } from "./barbers.controller.js";

export const barbersRouter = Router();

barbersRouter.get("/", barbersController.list);
barbersRouter.get("/available-users", barbersController.listAvailableUsers);
barbersRouter.post("/onboard-worker", requireRole("OWNER", "ADMIN"), barbersController.onboardWorker);
barbersRouter.post("/", requireRole("OWNER", "ADMIN"), barbersController.create);
barbersRouter.put("/:id", requireRole("OWNER", "ADMIN"), barbersController.update);
barbersRouter.delete("/:id", requireRole("OWNER", "ADMIN"), barbersController.remove);
