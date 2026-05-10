import { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import {
  platformUserCreateSchema,
  platformUserStatusSchema,
  platformUserUpdateSchema,
} from "./platform-users.schema.js";
import { platformUsersService } from "./platform-users.service.js";

export const platformUsersController = {
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json(await platformUsersService.list());
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformUser) throw new AppError("UNAUTHORIZED", 401);
      const data = platformUserCreateSchema.parse(req.body);
      res.status(201).json(await platformUsersService.create(data, req.platformUser.id));
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformUser) throw new AppError("UNAUTHORIZED", 401);
      const data = platformUserUpdateSchema.parse(req.body);
      res.status(200).json(await platformUsersService.update(req.params.id, data, req.platformUser.id));
    } catch (error) {
      next(error);
    }
  },

  async changeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.platformUser) throw new AppError("UNAUTHORIZED", 401);
      const input = platformUserStatusSchema.parse(req.body);
      res.status(200).json(await platformUsersService.changeStatus(req.params.id, input, req.platformUser.id));
    } catch (error) {
      next(error);
    }
  },
};
