import { Router } from "express";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import {
  forgotPasswordLimiter,
  loginLimiter,
  lookupEmailLimiter,
  registerLimiter,
  resetPasswordLimiter,
} from "../../middleware/rateLimit.js";
import { authController } from "./auth.controller.js";

export const authRouter = Router();

// Public routes
authRouter.post("/lookup-email", lookupEmailLimiter, authController.lookupEmail);
authRouter.post("/register", registerLimiter, authController.register);
authRouter.post("/login", loginLimiter, authController.login);
authRouter.post("/forgot-password", forgotPasswordLimiter, authController.forgotPassword);
authRouter.post("/reset-password", resetPasswordLimiter, authController.resetPassword);

// Public — refresh token rotation (no active JWT required)
authRouter.post("/refresh-token", authController.refreshWithToken);

// Protected routes (require valid JWT)
authRouter.get("/me", authMiddleware, authController.me);
authRouter.post("/logout", authMiddleware, authController.logout);
authRouter.post("/refresh", authMiddleware, authController.refreshToken); // legacy
authRouter.post("/change-password", authMiddleware, authController.changePassword);
