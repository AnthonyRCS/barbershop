import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { authService } from "./auth.service.js";
import {
  ChangePasswordSchema,
  ForgotPasswordSchema,
  LoginSchema,
  LookupEmailSchema,
  RefreshTokenSchema,
  RegisterSchema,
  ResetPasswordSchema,
} from "./auth.schema.js";

export const authController = {
  // ── Lookup email ─────────────────────────────────────────────────────────────

  async lookupEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = LookupEmailSchema.parse(req.body);
      const result = await authService.lookupEmail(payload);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // ── Me ────────────────────────────────────────────────────────────────────────

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.me(req.user!.id, req.user!.businessId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // ── Register ─────────────────────────────────────────────────────────────────

  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = RegisterSchema.parse(req.body);
      const meta = { ipAddress: req.ip, userAgent: req.headers["user-agent"] };
      const result = await authService.register(payload, meta);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },

  // ── Login ─────────────────────────────────────────────────────────────────────

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = LoginSchema.parse(req.body);
      const meta = { ipAddress: req.ip, userAgent: req.headers["user-agent"] };
      const result = await authService.login(payload, meta);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  // ── Logout ────────────────────────────────────────────────────────────────────

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : null;
      if (!token) {
        res.status(400).json({ error: "BAD_REQUEST", message: "Token requerido" });
        return;
      }

      const decoded = jwt.decode(token) as { exp?: number } | null;
      const expSec = decoded?.exp ?? null;
      const expDate = expSec ? new Date(expSec * 1000) : null;
      const userId = req.user!.id;

      await authService.logout(token, userId, expDate);
      res.json({ message: "Logout exitoso" });
    } catch (error) {
      next(error);
    }
  },

  // ── Refresh token (legacy — requires active JWT) ──────────────────────────────

  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id, businessId, role } = req.user!;
      const result = await authService.refreshToken(id, businessId, role as string);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // ── Refresh with refresh token (rotation) ─────────────────────────────────────

  async refreshWithToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = RefreshTokenSchema.parse(req.body);
      const meta = { ipAddress: req.ip, userAgent: req.headers["user-agent"] };
      const result = await authService.refreshWithToken(payload, meta);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // ── Forgot password ───────────────────────────────────────────────────────────

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = ForgotPasswordSchema.parse(req.body);
      const result = await authService.forgotPassword(payload, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // ── Reset password ────────────────────────────────────────────────────────────

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = ResetPasswordSchema.parse(req.body);
      const result = await authService.resetPassword(payload, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // ── Change password (authenticated) ──────────────────────────────────────────

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payload = ChangePasswordSchema.parse(req.body);
      const result = await authService.changePassword(req.user!.id, payload, {
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  },
};
