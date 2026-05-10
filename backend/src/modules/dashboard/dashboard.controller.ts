import { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { dashboardService } from "./dashboard.service.js";

export const dashboardController = {
  async summary(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.json(await dashboardService.summary(req.user.businessId));
    } catch (error) { next(error); }
  },
};
