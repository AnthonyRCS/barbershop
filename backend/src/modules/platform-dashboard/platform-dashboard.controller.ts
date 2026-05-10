import { NextFunction, Request, Response } from "express";
import { platformDashboardService } from "./platform-dashboard.service.js";

export const platformDashboardController = {
  async getMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json(await platformDashboardService.getMetrics());
    } catch (error) {
      next(error);
    }
  },

  async getGrowth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json(await platformDashboardService.getGrowth());
    } catch (error) {
      next(error);
    }
  },

  async getRecentActivity(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json(await platformDashboardService.getRecentActivity());
    } catch (error) {
      next(error);
    }
  },
};
