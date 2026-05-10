import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { tokenCache } from "../utils/tokenCache.js";

interface AuthTokenPayload extends JwtPayload {
  sub: string;
  businessId: string;
  role: string;
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("UNAUTHORIZED", 401, "Missing Bearer token");
    }

    const token = authHeader.replace("Bearer ", "");
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;

    // Check token revocation (in-memory cache first, then DB)
    let isRevoked = tokenCache.isRevoked(token);
    if (isRevoked === null) {
      const revoked = await prisma.revokedToken.findUnique({ where: { token } });
      isRevoked = !!revoked;
      tokenCache.set(token, isRevoked);
    }
    if (isRevoked) {
      throw new AppError("TOKEN_REVOKED", 401, "Token has been revoked");
    }

    const user = await prisma.user.findFirst({
      where: { id: payload.sub, businessId: payload.businessId, deletedAt: null },
      select: {
        id: true,
        businessId: true,
        role: true,
        active: true,
        business: {
          select: { id: true, status: true, slug: true, name: true, deletedAt: true },
        },
      },
    });

    if (!user || !user.active || user.business.deletedAt) {
      throw new AppError("UNAUTHORIZED", 401, "User is not active");
    }

    if (user.business.status === "SUSPENDED" || user.business.status === "CANCELLED") {
      throw new AppError("BUSINESS_INACTIVE", 403, "Business is not active");
    }

    req.user = {
      id: user.id,
      businessId: user.businessId,
      role: user.role,
      business: {
        id: user.business.id,
        status: user.business.status,
        slug: user.business.slug,
        name: user.business.name,
      },
    };

    next();
  } catch (error) {
    next(error);
  }
}
