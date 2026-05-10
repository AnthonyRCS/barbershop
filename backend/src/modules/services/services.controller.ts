import { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { servicesService } from "./services.service.js";

export const servicesController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      res.status(200).json(await servicesService.list(req.user.businessId, search));
    } catch (error) {
      next(error);
    }
  },
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(201).json(await servicesService.create(req.user.businessId, req.body));
    } catch (error) {
      next(error);
    }
  },
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(200).json(await servicesService.update(req.params.id, req.user.businessId, req.body));
    } catch (error) {
      next(error);
    }
  },
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      await servicesService.remove(req.params.id, req.user.businessId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};