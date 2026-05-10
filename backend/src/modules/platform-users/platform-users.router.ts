import { Router } from "express";
import { requirePlatformRole } from "../../middleware/platform-rbac.middleware.js";
import { platformUsersController } from "./platform-users.controller.js";

export const platformUsersRouter = Router();

platformUsersRouter.get("/", requirePlatformRole("SUPERADMIN"), platformUsersController.list);
platformUsersRouter.post("/", requirePlatformRole("SUPERADMIN"), platformUsersController.create);
platformUsersRouter.patch("/:id", requirePlatformRole("SUPERADMIN"), platformUsersController.update);
platformUsersRouter.patch("/:id/status", requirePlatformRole("SUPERADMIN"), platformUsersController.changeStatus);
