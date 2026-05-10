/**
 * Customer Portal — Phase 2
 *
 * Self-service portal for customers to register, view their appointments,
 * and claim existing barbershop records via staff-issued invitation tokens.
 *
 * Auth: separate JWT signed with CUSTOMER_JWT_SECRET (not the staff JWT_SECRET).
 * Requires CUSTOMER_JWT_SECRET env var to be set.
 */

import { NextFunction, Request, Response, Router } from "express";
import { customerAuthMiddleware } from "../../middleware/customer-auth.middleware.js";
import { AppError } from "../../lib/errors.js";
import {
  PortalRegisterSchema,
  PortalLoginSchema,
  PortalClaimAccountSchema,
  PortalVerifyEmailSchema,
  PortalUpdateMeSchema,
  PortalAppointmentsQuerySchema,
  PortalRequestAppointmentSchema,
  PortalCancelAppointmentParamsSchema,
  PortalAvailabilityQuerySchema,
} from "./customer-portal.schema.js";
import { customerPortalService } from "./customer-portal.service.js";

export const customerPortalRouter = Router();

// ─── Auth (public) ────────────────────────────────────────────────────────────

customerPortalRouter.post("/auth/register", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = PortalRegisterSchema.parse(req.body);
    const result = await customerPortalService.register(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

customerPortalRouter.post("/auth/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = PortalLoginSchema.parse(req.body);
    const result = await customerPortalService.login(payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

customerPortalRouter.post("/auth/claim-account", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = PortalClaimAccountSchema.parse(req.body);
    const result = await customerPortalService.claimAccount(payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

customerPortalRouter.post("/auth/verify-email", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = PortalVerifyEmailSchema.parse(req.body);
    const result = await customerPortalService.verifyEmail(payload);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ─── Protected (require customer JWT) ────────────────────────────────────────

customerPortalRouter.get("/me", customerAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.customerAccountId) throw new AppError("UNAUTHORIZED", 401);
    const result = await customerPortalService.getMe(req.customerAccountId);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

customerPortalRouter.patch("/me", customerAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.customerAccountId) throw new AppError("UNAUTHORIZED", 401);
    // Validate only — actual profile update touches Customer records, not CustomerAccount
    PortalUpdateMeSchema.parse(req.body);
    res.status(501).json({ error: { code: "NOT_IMPLEMENTED", message: "PATCH /me — coming in Phase 2b" } });
  } catch (error) {
    next(error);
  }
});

customerPortalRouter.get("/my-appointments", customerAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.customerAccountId) throw new AppError("UNAUTHORIZED", 401);
    const query = PortalAppointmentsQuerySchema.parse({ ...req.query, upcoming: "true" });
    const result = await customerPortalService.getAppointments(req.customerAccountId, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

customerPortalRouter.get("/my-history", customerAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.customerAccountId) throw new AppError("UNAUTHORIZED", 401);
    const query = PortalAppointmentsQuerySchema.parse({ ...req.query, upcoming: "false" });
    const result = await customerPortalService.getAppointments(req.customerAccountId, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

customerPortalRouter.get("/businesses/:slug/catalog", customerAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.customerAccountId) throw new AppError("UNAUTHORIZED", 401);
    const result = await customerPortalService.getBusinessCatalog(req.customerAccountId, req.params.slug);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

customerPortalRouter.get("/businesses/:slug/availability", customerAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.customerAccountId) throw new AppError("UNAUTHORIZED", 401);
    const query = PortalAvailabilityQuerySchema.parse(req.query);
    const result = await customerPortalService.getAvailability(req.customerAccountId, req.params.slug, query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

customerPortalRouter.post("/businesses/:slug/request-appointment", customerAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.customerAccountId) throw new AppError("UNAUTHORIZED", 401);
    const payload = PortalRequestAppointmentSchema.parse(req.body);
    const result = await customerPortalService.requestAppointment(req.customerAccountId, req.params.slug, payload);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

customerPortalRouter.post("/my-appointments/:id/cancel", customerAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.customerAccountId) throw new AppError("UNAUTHORIZED", 401);
    const params = PortalCancelAppointmentParamsSchema.parse(req.params);
    const result = await customerPortalService.cancelAppointment(req.customerAccountId, params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});
