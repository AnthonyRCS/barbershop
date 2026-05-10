import { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { salesService } from "./sales.service.js";

export const salesController = {
  async listSales(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.json(await salesService.listSales(req.user.businessId));
    } catch (error) { next(error); }
  },
  async createSale(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(201).json(await salesService.createSale(req.user.businessId, req.user.id, req.body));
    } catch (error) { next(error); }
  },
  async listCashClosings(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.json(await salesService.listCashClosings(req.user.businessId));
    } catch (error) { next(error); }
  },
  async createCashClosing(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(201).json(await salesService.createCashClosing(req.user.businessId, req.user.id, req.body));
    } catch (error) { next(error); }
  },
};
