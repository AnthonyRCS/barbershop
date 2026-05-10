import { NextFunction, Request, RequestHandler, Response } from "express";
import { AppError } from "../lib/errors.js";

type PlatformRole = "SUPERADMIN" | "SUPPORT" | "FINANCE" | "ANALYST";

export function requirePlatformRole(...roles: PlatformRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.platformUser) {
      next(new AppError("UNAUTHORIZED", 401));
      return;
    }

    if (!roles.includes(req.platformUser.role)) {
      next(new AppError("FORBIDDEN", 403, "Insufficient platform permissions"));
      return;
    }

    next();
  };
}
