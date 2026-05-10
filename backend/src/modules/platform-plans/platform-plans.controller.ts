import { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { planCreateSchema, planUpdateSchema } from "./platform-plans.schema.js";
import { platformPlansService } from "./platform-plans.service.js";

export const platformPlansController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json(await platformPlansService.list());
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformUser) throw new AppError("UNAUTHORIZED", 401);
      const data = planCreateSchema.parse(req.body);
      res.status(201).json(await platformPlansService.create(data, req.platformUser.id));
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformUser) throw new AppError("UNAUTHORIZED", 401);
      const data = planUpdateSchema.parse(req.body);
      res.status(200).json(await platformPlansService.update(req.params.id, data, req.platformUser.id));
    } catch (error) {
      next(error);
    }
  },

  async toggle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformUser) throw new AppError("UNAUTHORIZED", 401);
      res.status(200).json(await platformPlansService.toggle(req.params.id, req.platformUser.id));
    } catch (error) {
      next(error);
    }
  },
};
