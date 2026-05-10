import { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import {
  businessListQuerySchema,
  businessPlanSchema,
  businessStatusSchema,
  businessUpdateSchema,
} from "./platform-businesses.schema.js";
import { platformBusinessesService } from "./platform-businesses.service.js";

export const platformBusinessesController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = businessListQuerySchema.parse(req.query);
      res.status(200).json(await platformBusinessesService.list(query));
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json(await platformBusinessesService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformUser) throw new AppError("UNAUTHORIZED", 401);
      const data = businessUpdateSchema.parse(req.body);
      res.status(200).json(await platformBusinessesService.update(req.params.id, data, req.platformUser.id));
    } catch (error) {
      next(error);
    }
  },

  async changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformUser) throw new AppError("UNAUTHORIZED", 401);
      const input = businessStatusSchema.parse(req.body);
      res.status(200).json(await platformBusinessesService.changeStatus(req.params.id, input, req.platformUser.id));
    } catch (error) {
      next(error);
    }
  },

  async changePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformUser) throw new AppError("UNAUTHORIZED", 401);
      const input = businessPlanSchema.parse(req.body);
      res.status(200).json(await platformBusinessesService.changePlan(req.params.id, input, req.platformUser.id));
    } catch (error) {
      next(error);
    }
  },
};
