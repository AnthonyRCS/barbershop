import { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import {
  subscriptionListQuerySchema,
  subscriptionStatusSchema,
  subscriptionUpdateSchema,
} from "./platform-subscriptions.schema.js";
import { platformSubscriptionsService } from "./platform-subscriptions.service.js";

export const platformSubscriptionsController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = subscriptionListQuerySchema.parse(req.query);
      res.status(200).json(await platformSubscriptionsService.list(query));
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json(await platformSubscriptionsService.getById(req.params.id));
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformUser) throw new AppError("UNAUTHORIZED", 401);
      const data = subscriptionUpdateSchema.parse(req.body);
      res.status(200).json(await platformSubscriptionsService.update(req.params.id, data, req.platformUser.id));
    } catch (error) {
      next(error);
    }
  },

  async changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformUser) throw new AppError("UNAUTHORIZED", 401);
      const input = subscriptionStatusSchema.parse(req.body);
      res.status(200).json(await platformSubscriptionsService.changeStatus(req.params.id, input, req.platformUser.id));
    } catch (error) {
      next(error);
    }
  },
};
