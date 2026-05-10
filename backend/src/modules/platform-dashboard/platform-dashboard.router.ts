import { Router } from "express";
import { platformDashboardController } from "./platform-dashboard.controller.js";

export const platformDashboardRouter = Router();

platformDashboardRouter.get("/metrics", platformDashboardController.getMetrics);
platformDashboardRouter.get("/growth", platformDashboardController.getGrowth);
platformDashboardRouter.get("/recent-activity", platformDashboardController.getRecentActivity);
