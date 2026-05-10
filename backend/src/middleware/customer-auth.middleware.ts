import { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";
import { verifyCustomerToken } from "../modules/customer-portal/customer-portal.service.js";

export function customerAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("UNAUTHORIZED", 401, "Missing Bearer token");
    }
    const token = authHeader.slice(7);
    const payload = verifyCustomerToken(token);
    req.customerAccountId = payload.sub;
    next();
  } catch (error) {
    next(error);
  }
}
