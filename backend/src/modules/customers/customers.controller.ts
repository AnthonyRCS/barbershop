import { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { customersService } from "./customers.service.js";

export const customersController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(200).json(await customersService.list(req.user.businessId, req.query));
    } catch (error) {
      next(error);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(200).json(await customersService.getById(req.params.id, req.user.businessId));
    } catch (error) {
      next(error);
    }
  },

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res
        .status(201)
        .json(await customersService.create(req.user.businessId, req.body, req.user.id));
    } catch (error) {
      next(error);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res
        .status(200)
        .json(await customersService.update(req.params.id, req.user.businessId, req.body));
    } catch (error) {
      next(error);
    }
  },

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      await customersService.remove(req.params.id, req.user.businessId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res
        .status(200)
        .json(
          await customersService.getHistory(req.params.id, req.user.businessId, req.query),
        );
    } catch (error) {
      next(error);
    }
  },

  async lookup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(200).json(await customersService.lookup(req.user.businessId, req.body));
    } catch (error) {
      next(error);
    }
  },

  async recalculateStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res
        .status(200)
        .json(await customersService.recalculateStats(req.params.id, req.user.businessId));
    } catch (error) {
      next(error);
    }
  },

  async inviteToPortal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(200).json(await customersService.inviteToPortal(req.user.businessId, req.user.id, req.body));
    } catch (error) {
      next(error);
    }
  },
};
