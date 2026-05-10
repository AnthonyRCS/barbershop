import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { tenantMiddleware } from "../middleware/tenant.middleware.js";
import { appointmentsRouter } from "../modules/appointments/appointments.router.js";
import { authRouter } from "../modules/auth/auth.router.js";
import { barbersRouter } from "../modules/barbers/barbers.router.js";
import { businessRouter } from "../modules/business/business.router.js";
import { customersRouter } from "../modules/customers/customers.router.js";
import { customerPortalRouter } from "../modules/customer-portal/customer-portal.router.js";
import { dashboardRouter } from "../modules/dashboard/dashboard.router.js";
import { inventoryRouter } from "../modules/inventory/inventory.router.js";
import { salesRouter } from "../modules/sales/sales.router.js";
import { scheduleRouter } from "../modules/schedule/schedule.router.js";
import { servicesRouter } from "../modules/services/services.router.js";

export const routes = Router();

routes.use("/auth", authRouter);

// Phase 2: customer portal — public auth endpoints (no staff JWT required)
routes.use("/customer-portal", customerPortalRouter);

routes.use(authMiddleware, tenantMiddleware);
routes.use("/appointments", appointmentsRouter);
routes.use("/barbers", barbersRouter);
routes.use("/customers", customersRouter);
routes.use("/services", servicesRouter);
routes.use("/business", businessRouter);
routes.use("/inventory", inventoryRouter);
routes.use("/sales", salesRouter);
routes.use("/schedule", scheduleRouter);
routes.use("/dashboard", dashboardRouter);
