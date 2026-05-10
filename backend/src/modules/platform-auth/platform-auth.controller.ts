import { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { platformLoginSchema } from "./platform-auth.schema.js";
import { platformAuthService } from "./platform-auth.service.js";

export const platformAuthController = {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = platformLoginSchema.parse(req.body);
      const ipAddress = req.ip ?? req.socket.remoteAddress;
      const userAgent = req.headers["user-agent"];
      const result = await platformAuthService.login(input, ipAddress, userAgent);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  },

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformUser) throw new AppError("UNAUTHORIZED", 401);
      res.status(200).json({ user: req.platformUser });
    } catch (error) {
      next(error);
    }
  },
};
