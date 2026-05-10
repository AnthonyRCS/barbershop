import { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { barbersService } from "./barbers.service.js";

export const barbersController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(200).json(await barbersService.list(req.user.businessId));
    } catch (error) {
      next(error);
    }
  },
  async listAvailableUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      res.status(200).json(await barbersService.listAvailableUsers(req.user.businessId, search));
    } catch (error) {
      next(error);
    }
  },
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(201).json(await barbersService.create(req.user.businessId, req.body));
    } catch (error) {
      next(error);
    }
  },
  async onboardWorker(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(201).json(await barbersService.onboardWorker(req.user.businessId, req.body));
    } catch (error) {
      next(error);
    }
  },
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(200).json(await barbersService.update(req.params.id, req.user.businessId, req.body));
    } catch (error) {
      next(error);
    }
  },
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      await barbersService.remove(req.params.id, req.user.businessId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};
