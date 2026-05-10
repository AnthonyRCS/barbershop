import rateLimit from "express-rate-limit";
import { Router } from "express";
import { platformAuthController } from "./platform-auth.controller.js";
import { platformAuthMiddleware } from "../../middleware/platform-auth.middleware.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: "TOO_MANY_ATTEMPTS", message: "Too many login attempts. Try again later." },
  },
});

export const platformAuthRouter = Router();

platformAuthRouter.post("/login", loginLimiter, platformAuthController.login);
platformAuthRouter.get("/me", platformAuthMiddleware, platformAuthController.me);
