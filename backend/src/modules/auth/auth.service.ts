import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../../lib/errors.js";
import { env } from "../../config/env.js";
import { createAuditLog } from "../../utils/audit.js";
import { hashPassword, comparePassword, validatePasswordComplete, validatePasswordHistory } from "../../utils/password.js";
import { sendMail, buildPasswordResetEmail } from "../../lib/mailer.js";
import { generateResetToken, hashToken, isTokenExpired } from "../../utils/token.js";
import { tokenCache } from "../../utils/tokenCache.js";
import { getPublicFrontendUrl } from "../../utils/origins.js";
import { LoginInput, RegisterInput, ForgotPasswordInput, ResetPasswordInput, ChangePasswordInput, LookupEmailInput, RefreshTokenInput } from "./auth.schema.js";
import { authRepository } from "./auth.repository.js";

// ── Permission map (role → capabilities) ─────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  OWNER: [
    "appointments:read", "appointments:write", "appointments:delete",
    "barbers:read", "barbers:write", "barbers:delete",
    "customers:read", "customers:write", "customers:delete",
    "services:read", "services:write", "services:delete",
    "business:read", "business:write",
  ],
  ADMIN: [
    "appointments:read", "appointments:write", "appointments:delete",
    "barbers:read", "barbers:write",
    "customers:read", "customers:write", "customers:delete",
    "services:read", "services:write",
  ],
  RECEPTIONIST: [
    "appointments:read", "appointments:write",
    "customers:read", "customers:write",
  ],
  BARBER: [
    "appointments:read",
    "customers:read",
  ],
};

// ── Token helpers ─────────────────────────────────────────────────────────────

function signAccessToken(payload: { sub: string; businessId: string; role: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

/** @deprecated Use signAccessToken */
function signToken(payload: { sub: string; businessId: string; role: string }): string {
  return signAccessToken(payload);
}

async function issueRefreshToken(
  userId: string,
  meta: { ipAddress?: string; userAgent?: string }
): Promise<string> {
  const { token, hashedToken, expiresAt } = generateResetToken(30 * 24 * 60); // 30 days
  await authRepository.createRefreshToken({
    userId,
    tokenHash: hashedToken,
    expiresAt,
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
  });
  return token;
}

export const authService = {
  // ── Register ─────────────────────────────────────────────────────────────────

  async register(input: RegisterInput, meta: { ipAddress?: string; userAgent?: string } = {}) {
    const normalizedBusinessSlug = input.businessSlug.trim().toLowerCase();
    const normalizedBusinessEmail = input.businessEmail.trim().toLowerCase();
    const normalizedOwnerEmail = input.email.trim().toLowerCase();

    const existingBusiness = await authRepository.findBusinessBySlug(normalizedBusinessSlug);
    if (existingBusiness) {
      throw new AppError("BUSINESS_SLUG_TAKEN", 409, "Business slug already in use");
    }

    const plan = await authRepository.findPlanForTrial();
    if (!plan) {
      throw new AppError("PLAN_NOT_FOUND", 500, "No active plan found");
    }

    // Password strength validation
    const passwordValidation = validatePasswordComplete(input.password, { minScore: 60 });
    if (!passwordValidation.isValid) {
      throw new AppError("WEAK_PASSWORD", 400, passwordValidation.errors.join(", "));
    }

    const passwordHash = await hashPassword(input.password);

    const created = await authRepository.createBusinessAndOwner({
      business: {
        name: input.businessName,
        slug: normalizedBusinessSlug,
        email: normalizedBusinessEmail,
        phone: input.businessPhone,
        address: input.businessAddress,
        planId: plan.id,
      },
      user: {
        name: input.name,
        email: normalizedOwnerEmail,
        passwordHash,
        role: input.role,
      },
    });

    await createAuditLog({
      businessId: created.business.id,
      userId: created.user.id,
      action: "CREATE",
      entity: "User",
      entityId: created.user.id,
      after: created.user,
    });

    const token = signAccessToken({
      sub: created.user.id,
      businessId: created.user.businessId,
      role: created.user.role,
    });

    const refreshToken = await issueRefreshToken(created.user.id, meta);

    return {
      token,
      refreshToken,
      user: {
        ...created.user,
        permissions: ROLE_PERMISSIONS[created.user.role] ?? [],
        business: {
          id: created.business.id,
          name: created.business.name,
          slug: created.business.slug,
          status: created.business.status,
        },
      },
    };
  },

  // ── Lookup email (resolve business from email) ────────────────────────────────

  async lookupEmail(input: LookupEmailInput) {
    const rows = await authRepository.findBusinessesByEmail(input.email);

    let businesses = rows
      .map((r) => r.business)
      .filter((b) => b.deletedAt === null && b.status !== "CANCELLED")
      .map((b) => ({ slug: b.slug, name: b.name, status: b.status }));

    // UX fallback:
    // If email belongs to an active SUPERADMIN platform user, return a default business slug
    // so the tenant login form can autofill "Negocio (slug)".
    if (businesses.length === 0) {
      const platformUser = await authRepository.findPlatformUserByEmail(input.email);
      if (platformUser?.status === "ACTIVE" && platformUser.role === "SUPERADMIN") {
        const defaultBusiness = await authRepository.findDefaultBusinessForPlatformLogin();
        if (defaultBusiness) {
          businesses = [defaultBusiness];
        }
      }
    }

    return { businesses };
  },

  // ── Login ─────────────────────────────────────────────────────────────────────

  async login(input: LoginInput, meta: { ipAddress?: string; userAgent?: string } = {}) {
    let business: Awaited<ReturnType<typeof authRepository.findBusinessBySlug>>;

    if (input.businessSlug) {
      // Explicit slug provided — use it directly
      business = await authRepository.findBusinessBySlug(input.businessSlug);
      if (!business) {
        throw new AppError("BUSINESS_NOT_FOUND", 404, "Negocio no encontrado");
      }
    } else {
      // No slug — resolve from email
      const rows = await authRepository.findBusinessesByEmail(input.email);
      const active = rows
        .map((r) => r.business)
        .filter((b) => b.deletedAt === null && b.status !== "CANCELLED");

      if (active.length === 0) {
        throw new AppError("INVALID_CREDENTIALS", 401, "Credenciales inválidas");
      }
      if (active.length > 1) {
        throw new AppError(
          "MULTIPLE_BUSINESSES",
          400,
          "Tu email está registrado en múltiples negocios. Selecciona uno.",
          { businesses: active.map((b) => ({ slug: b.slug, name: b.name })) }
        );
      }
      business = await authRepository.findBusinessBySlug(active[0].slug);
      if (!business) throw new AppError("INVALID_CREDENTIALS", 401, "Credenciales inválidas");
    }

    const user = await authRepository.findUserByEmailAndBusiness(input.email, business.id);
    if (!user || !user.active) {
      throw new AppError("INVALID_CREDENTIALS", 401, "Credenciales inválidas");
    }

    const matches = await bcrypt.compare(input.password, user.passwordHash);
    if (!matches) {
      throw new AppError("INVALID_CREDENTIALS", 401, "Credenciales inválidas");
    }

    if (business.status === "SUSPENDED" || business.status === "CANCELLED") {
      throw new AppError("BUSINESS_INACTIVE", 403, "El negocio no está activo");
    }

    await authRepository.updateLastLogin(user.id);

    await createAuditLog({
      businessId: business.id,
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
    });

    const token = signAccessToken({
      sub: user.id,
      businessId: user.businessId,
      role: user.role,
    });

    const refreshToken = await issueRefreshToken(user.id, meta);

    return {
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: ROLE_PERMISSIONS[user.role] ?? [],
        business: {
          id: business.id,
          name: business.name,
          slug: business.slug,
          status: business.status,
        },
      },
    };
  },

  // ── Me (current user info) ────────────────────────────────────────────────────

  async me(userId: string, businessId: string) {
    const user = await authRepository.findUserById(userId);
    if (!user || !user.active) {
      throw new AppError("UNAUTHORIZED", 401, "Usuario inactivo");
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] ?? [],
      business: {
        id: user.business.id,
        name: user.business.name,
        slug: user.business.slug,
        status: user.business.status,
      },
    };
  },

  // ── Logout ────────────────────────────────────────────────────────────────────

  async logout(token: string, userId: string, exp: Date | null) {
    await authRepository.createRevokedToken({ token, userId, exp });
    tokenCache.markAsRevoked(token);
    await authRepository.revokeAllUserRefreshTokens(userId);
  },

  // ── Refresh token (legacy — requires active access token) ─────────────────────

  async refreshToken(userId: string, businessId: string, role: string) {
    const user = await authRepository.findUserById(userId);
    if (!user || !user.active) {
      throw new AppError("UNAUTHORIZED", 401, "User is not active");
    }

    const token = signAccessToken({ sub: userId, businessId, role });
    return { token };
  },

  // ── Refresh with refresh token (rotation) ────────────────────────────────────

  async refreshWithToken(
    input: RefreshTokenInput,
    meta: { ipAddress?: string; userAgent?: string }
  ) {
    const { hashToken } = await import("../../utils/token.js");
    const tokenHash = hashToken(input.refreshToken);
    const record = await authRepository.findRefreshToken(tokenHash);

    if (!record) {
      throw new AppError("INVALID_REFRESH_TOKEN", 401, "Refresh token inválido");
    }
    if (record.usedAt) {
      // Token reuse detected — revoke all tokens for this user (potential theft)
      await authRepository.revokeAllUserRefreshTokens(record.userId);
      throw new AppError("REFRESH_TOKEN_REUSED", 401, "Refresh token ya fue utilizado");
    }
    if (isTokenExpired(record.expiresAt)) {
      throw new AppError("REFRESH_TOKEN_EXPIRED", 401, "Refresh token expirado");
    }
    if (!record.user.active) {
      throw new AppError("UNAUTHORIZED", 401, "Usuario inactivo");
    }

    // Rotate: mark old token as used, issue new pair
    await authRepository.markRefreshTokenUsed(record.id);

    const accessToken = signAccessToken({
      sub: record.userId,
      businessId: record.user.businessId,
      role: record.user.role,
    });
    const newRefreshToken = await issueRefreshToken(record.userId, meta);

    return { token: accessToken, refreshToken: newRefreshToken };
  },

  // ── Forgot password ───────────────────────────────────────────────────────────

  async forgotPassword(
    input: ForgotPasswordInput,
    meta: { ipAddress?: string; userAgent?: string }
  ) {
    const business = await authRepository.findBusinessBySlug(input.businessSlug);
    if (!business) {
      // Return generic message to avoid user enumeration
      return { message: "Si el email existe, recibirás un enlace de recuperación." };
    }

    const user = await authRepository.findUserByEmailAndBusiness(input.email, business.id);
    if (!user || !user.active) {
      return { message: "Si el email existe, recibirás un enlace de recuperación." };
    }

    // Invalidate previous reset tokens
    await authRepository.invalidatePreviousResetTokens(user.id);

    // Generate secure reset token (plain → send to user, hashed → store in DB)
    const { token, hashedToken, expiresAt } = generateResetToken(60);

    await authRepository.createPasswordResetToken({
      userId: user.id,
      tokenHash: hashedToken,
      expiresAt,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    const resetUrl = `${getPublicFrontendUrl()}/reset-password?token=${token}`;

    if (env.NODE_ENV !== "production") {
      // In dev: also return the token so it can be used directly (e.g. from the UI)
      try {
        await sendMail({
          to: user.email,
          subject: "Recupera tu contraseña — Barbershop Pro",
          html: buildPasswordResetEmail(resetUrl, user.name),
        });
      } catch {
        // Non-blocking in dev
      }
      return {
        message: "Token de recuperación generado (solo dev).",
        resetToken: token,
        expiresAt,
      };
    }

    // Production: send email, never expose the raw token
    await sendMail({
      to: user.email,
      subject: "Recupera tu contraseña — Barbershop Pro",
      html: buildPasswordResetEmail(resetUrl, user.name),
    });

    return { message: "Si el email existe, recibirás un enlace de recuperación." };
  },

  // ── Reset password ────────────────────────────────────────────────────────────

  async resetPassword(
    input: ResetPasswordInput,
    meta: { ipAddress?: string; userAgent?: string }
  ) {
    const tokenHash = hashToken(input.token);
    const resetRecord = await authRepository.findPasswordResetToken(tokenHash);

    if (!resetRecord || resetRecord.used) {
      throw new AppError("INVALID_RESET_TOKEN", 400, "Token inválido o ya utilizado");
    }

    if (isTokenExpired(resetRecord.expiresAt)) {
      throw new AppError("EXPIRED_RESET_TOKEN", 400, "El token de recuperación ha expirado");
    }

    // Password strength validation
    const passwordValidation = validatePasswordComplete(input.password, { minScore: 60 });
    if (!passwordValidation.isValid) {
      throw new AppError("WEAK_PASSWORD", 400, passwordValidation.errors.join(", "));
    }

    // Password history check (last 3)
    const history = await authRepository.findPasswordHistory(resetRecord.userId, 3);
    const historyHashes = history.map((h) => h.passwordHash);
    const notInHistory = await validatePasswordHistory(input.password, historyHashes);
    if (!notInHistory) {
      throw new AppError("PASSWORD_REUSED", 400, "No puedes reutilizar una de tus últimas 3 contraseñas");
    }

    // Get current password hash before overwriting
    const user = await authRepository.findUserById(resetRecord.userId);
    if (!user) throw new AppError("USER_NOT_FOUND", 404);

    const newPasswordHash = await hashPassword(input.password);

    // Save old password to history
    await authRepository.createPasswordHistory({
      userId: user.id,
      passwordHash: user.passwordHash,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      reason: "reset",
    });

    // Update password and mark token as used
    await authRepository.updateUserPassword(user.id, newPasswordHash);
    await authRepository.markPasswordResetTokenUsed(resetRecord.id);

    return { message: "Contraseña actualizada exitosamente" };
  },

  // ── Change password (authenticated) ──────────────────────────────────────────

  async changePassword(
    userId: string,
    input: ChangePasswordInput,
    meta: { ipAddress?: string; userAgent?: string }
  ) {
    const user = await authRepository.findUserById(userId);
    if (!user) throw new AppError("USER_NOT_FOUND", 404);

    // Verify current password
    const matches = await comparePassword(input.currentPassword, user.passwordHash);
    if (!matches) {
      throw new AppError("INVALID_CREDENTIALS", 401, "La contraseña actual es incorrecta");
    }

    // New password must differ from current
    const sameAsCurrent = await comparePassword(input.newPassword, user.passwordHash);
    if (sameAsCurrent) {
      throw new AppError("PASSWORD_SAME", 400, "La nueva contraseña debe ser diferente a la actual");
    }

    // Password strength validation
    const passwordValidation = validatePasswordComplete(input.newPassword, { minScore: 60 });
    if (!passwordValidation.isValid) {
      throw new AppError("WEAK_PASSWORD", 400, passwordValidation.errors.join(", "));
    }

    // Password history check (last 3)
    const history = await authRepository.findPasswordHistory(userId, 3);
    const historyHashes = history.map((h) => h.passwordHash);
    const notInHistory = await validatePasswordHistory(input.newPassword, historyHashes);
    if (!notInHistory) {
      throw new AppError("PASSWORD_REUSED", 400, "No puedes reutilizar una de tus últimas 3 contraseñas");
    }

    // Save old password to history
    await authRepository.createPasswordHistory({
      userId,
      passwordHash: user.passwordHash,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      reason: "change",
    });

    const newPasswordHash = await hashPassword(input.newPassword);
    await authRepository.updateUserPassword(userId, newPasswordHash);

    // Invalidate any pending reset tokens
    await authRepository.invalidatePreviousResetTokens(userId);

    return { message: "Contraseña cambiada exitosamente" };
  },
};
