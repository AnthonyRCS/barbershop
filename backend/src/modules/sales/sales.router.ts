import { Router } from "express";
import { requireRole } from "../../middleware/rbac.middleware.js";
import { salesController } from "./sales.controller.js";

export const salesRouter = Router();

salesRouter.get("/", salesController.listSales);
salesRouter.post("/", requireRole("OWNER", "ADMIN", "RECEPTIONIST"), salesController.createSale);

salesRouter.get("/cash-closings", requireRole("OWNER", "ADMIN", "RECEPTIONIST"), salesController.listCashClosings);
salesRouter.post("/cash-closings", requireRole("OWNER", "ADMIN", "RECEPTIONIST"), salesController.createCashClosing);
