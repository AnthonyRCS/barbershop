import { Router } from "express";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { appointmentsController } from "./appointments.controller.js";

export const appointmentsRouter = Router();

appointmentsRouter.get("/", appointmentsController.list);
appointmentsRouter.get("/:id", appointmentsController.getById);
appointmentsRouter.post("/", requireRole("OWNER", "ADMIN", "RECEPTIONIST"), appointmentsController.create);
appointmentsRouter.put("/:id", requireRole("OWNER", "ADMIN", "RECEPTIONIST"), appointmentsController.update);
appointmentsRouter.delete("/:id", requireRole("OWNER", "ADMIN"), appointmentsController.remove);