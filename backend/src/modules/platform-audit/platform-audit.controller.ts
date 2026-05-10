import { z } from "zod";
import { NextFunction, Request, Response } from "express";
import { platformAuditRepository } from "./platform-audit.repository.js";

const querySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  action: z.string().optional(),
  entity: z.string().optional(),
  performedById: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const platformAuditController = {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = querySchema.parse(req.query);
      res.status(200).json(await platformAuditRepository.findMany(query));
    } catch (error) {
      next(error);
    }
  },
};
