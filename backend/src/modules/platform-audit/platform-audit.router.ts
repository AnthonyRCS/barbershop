import { Router } from "express";
import { platformAuditController } from "./platform-audit.controller.js";

export const platformAuditRouter = Router();

platformAuditRouter.get("/", platformAuditController.list);
