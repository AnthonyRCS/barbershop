import { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";

function getBusinessIdFromRequest(req: Request): string | undefined {
  const paramsBusinessId = typeof req.params.businessId === "string" ? req.params.businessId : undefined;
  const queryBusinessId = typeof req.query.businessId === "string" ? req.query.businessId : undefined;
  const bodyBusinessId =
    req.body && typeof req.body === "object" && "businessId" in req.body && typeof req.body.businessId === "string"
      ? req.body.businessId
      : undefined;

  return paramsBusinessId ?? queryBusinessId ?? bodyBusinessId;
}

export function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError("UNAUTHORIZED", 401));
    return;
  }

  const incomingBusinessId = getBusinessIdFromRequest(req);
  if (incomingBusinessId && incomingBusinessId !== req.user.businessId) {
    next(new AppError("TENANT_ACCESS_DENIED", 403, "Cross-tenant access denied"));
    return;
  }

  next();
}
