import { NextFunction, Request, Response } from "express";
import { AppError } from "../../lib/errors.js";
import { scheduleService } from "./schedule.service.js";

export const scheduleController = {
  async listBlocks(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.json(await scheduleService.listBlocks(req.user.businessId));
    } catch (error) { next(error); }
  },
  async createBlock(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(201).json(await scheduleService.createBlock(req.user.businessId, req.body));
    } catch (error) { next(error); }
  },
  async deleteBlock(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      await scheduleService.deleteBlock(req.params.id, req.user.businessId);
      res.status(204).send();
    } catch (error) { next(error); }
  },
  async listWaitlist(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.json(await scheduleService.listWaitlist(req.user.businessId));
    } catch (error) { next(error); }
  },
  async createWaitlist(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.status(201).json(await scheduleService.createWaitlist(req.user.businessId, req.body));
    } catch (error) { next(error); }
  },
  async updateWaitlistStatus(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError("UNAUTHORIZED", 401);
      res.json(await scheduleService.updateWaitlistStatus(req.params.id, req.user.businessId, req.body));
    } catch (error) { next(error); }
  },
};
