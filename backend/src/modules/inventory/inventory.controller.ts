import { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { inventoryService } from "./inventory.service.js";

export const inventoryController = {
  async listProducts(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.json(await inventoryService.listProducts(req.user.businessId));
    } catch (error) { next(error); }
  },
  async listMovements(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.json(await inventoryService.listMovements(req.user.businessId));
    } catch (error) { next(error); }
  },
  async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(201).json(await inventoryService.createProduct(req.user.businessId, req.body));
    } catch (error) { next(error); }
  },
  async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.json(await inventoryService.updateProduct(req.params.id, req.user.businessId, req.body));
    } catch (error) { next(error); }
  },
  async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      await inventoryService.deleteProduct(req.params.id, req.user.businessId);
      res.status(204).send();
    } catch (error) { next(error); }
  },
  async createMovement(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(201).json(await inventoryService.createMovement(req.user.businessId, req.user.id, req.body));
    } catch (error) { next(error); }
  },
};
