import { Role } from "@prisma/client";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "../lib/errors.js";

export function requireRole(...roles: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError("UNAUTHORIZED", 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError("FORBIDDEN", 403, "Insufficient permissions"));
      return;
    }

    next();
  };
}
