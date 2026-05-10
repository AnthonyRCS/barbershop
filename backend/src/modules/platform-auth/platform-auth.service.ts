import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";
import { createPlatformAuditLog } from "../../utils/platform-audit.js";
import { PlatformLoginInput } from "./platform-auth.schema.js";
import { platformAuthRepository } from "./platform-auth.repository.js";

function signPlatformToken(payload: { sub: string; role: string }): string {
  return jwt.sign(
    { ...payload, type: "platform" },
    env.PLATFORM_JWT_SECRET,
    { expiresIn: env.PLATFORM_JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] },
  );
}

export const platformAuthService = {
  async login(input: PlatformLoginInput, ipAddress?: string, userAgent?: string) {
    const user = await platformAuthRepository.findByEmail(input.email);

    if (!user || user.status !== "ACTIVE") {
      throw new AppError("INVALID_CREDENTIALS", 401, "Invalid credentials");
    }

    const matches = await bcrypt.compare(input.password, user.passwordHash);
    if (!matches) {
      throw new AppError("INVALID_CREDENTIALS", 401, "Invalid credentials");
    }

    await platformAuthRepository.updateLastLogin(user.id);

    await createPlatformAuditLog({
      performedById: user.id,
      action: "LOGIN",
      entity: "PlatformUser",
      entityId: user.id,
      ipAddress,
      userAgent,
    });

    const token = signPlatformToken({ sub: user.id, role: user.role });

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  },
};
