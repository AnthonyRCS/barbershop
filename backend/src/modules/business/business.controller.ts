import { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { businessService } from "./business.service.js";

export const businessController = {
  async getCurrent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(200).json(await businessService.getCurrent(req.user.businessId));
    } catch (error) {
      next(error);
    }
  },
  async updateCurrent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(200).json(await businessService.updateCurrent(req.user.businessId, req.body));
    } catch (error) {
      next(error);
    }
  },
  async getHours(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(200).json(await businessService.getHours(req.user.businessId));
    } catch (error) {
      next(error);
    }
  },
  async updateHours(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(200).json(await businessService.updateHours(req.user.businessId, req.body));
    } catch (error) {
      next(error);
    }
  },
};