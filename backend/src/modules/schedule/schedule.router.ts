import { Router } from "express";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { scheduleController } from "./schedule.controller.js";

export const scheduleRouter = Router();

scheduleRouter.get("/blocks", scheduleController.listBlocks);
scheduleRouter.post("/blocks", requireRole("OWNER", "ADMIN", "RECEPTIONIST"), scheduleController.createBlock);
scheduleRouter.delete("/blocks/:id", requireRole("OWNER", "ADMIN", "RECEPTIONIST"), scheduleController.deleteBlock);

scheduleRouter.get("/waitlist", scheduleController.listWaitlist);
scheduleRouter.post("/waitlist", requireRole("OWNER", "ADMIN", "RECEPTIONIST"), scheduleController.createWaitlist);
scheduleRouter.patch("/waitlist/:id/status", requireRole("OWNER", "ADMIN", "RECEPTIONIST"), scheduleController.updateWaitlistStatus);
