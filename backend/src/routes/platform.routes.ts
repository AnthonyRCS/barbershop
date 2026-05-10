import { Router } from "express";
import { platformAuthMiddleware } from "../middleware/platform-auth.middleware.js";
import { platformAuthRouter } from "../modules/platform-auth/platform-auth.router.js";
import { platformDashboardRouter } from "../modules/platform-dashboard/platform-dashboard.router.js";
import { platformBusinessesRouter } from "../modules/platform-businesses/platform-businesses.router.js";
import { platformPlansRouter } from "../modules/platform-plans/platform-plans.router.js";
import { platformSubscriptionsRouter } from "../modules/platform-subscriptions/platform-subscriptions.router.js";
import { platformUsersRouter } from "../modules/platform-users/platform-users.router.js";
import { platformAuditRouter } from "../modules/platform-audit/platform-audit.router.js";

export const platformRoutes = Router();

// Public: platform auth login
platformRoutes.use("/auth", platformAuthRouter);

// All routes below require platform authentication
platformRoutes.use(platformAuthMiddleware);

platformRoutes.use("/dashboard", platformDashboardRouter);
platformRoutes.use("/businesses", platformBusinessesRouter);
platformRoutes.use("/plans", platformPlansRouter);
platformRoutes.use("/subscriptions", platformSubscriptionsRouter);
platformRoutes.use("/users", platformUsersRouter);
platformRoutes.use("/audit-logs", platformAuditRouter);
