import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

type PlatformRole = "SUPERADMIN" | "SUPPORT" | "FINANCE" | "ANALYST";

interface PlatformTokenPayload extends JwtPayload {
  sub: string;
  role: PlatformRole;
  type: "platform";
}

export async function platformAuthMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("UNAUTHORIZED", 401, "Missing Bearer token");
    }

    const token = authHeader.replace("Bearer ", "");
    let payload: PlatformTokenPayload;

    try {
      payload = jwt.verify(token, env.PLATFORM_JWT_SECRET) as PlatformTokenPayload;
    } catch {
      throw new AppError("UNAUTHORIZED", 401, "Invalid or expired platform token");
    }

    if (payload.type !== "platform") {
      throw new AppError("UNAUTHORIZED", 401, "Invalid token type");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platformUser = await (prisma as any).platformUser.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true, name: true, email: true },
    }) as { id: string; role: PlatformRole; status: "ACTIVE" | "INACTIVE"; name: string; email: string } | null;

    if (!platformUser || platformUser.status !== "ACTIVE") {
      throw new AppError("UNAUTHORIZED", 401, "Platform user not found or inactive");
    }

    req.platformUser = platformUser;
    next();
  } catch (error) {
    next(error);
  }
}
