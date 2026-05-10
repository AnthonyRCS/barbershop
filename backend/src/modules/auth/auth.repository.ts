import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const platformUser = () => (prisma as any).platformUser;

export const authRepository = {
  // ── Business / User finders ─────────────────────────────────────────────────

  findBusinessBySlug(slug: string) {
    return prisma.business.findFirst({
      where: { slug, deletedAt: null },
      include: { plan: true },
    });
  },

  findUserByEmailAndBusiness(email: string, businessId: string) {
    return prisma.user.findFirst({
      where: { email, businessId, deletedAt: null },
      include: { business: true },
    });
  },

  /** Find all active businesses where this email is registered */
  findBusinessesByEmail(email: string) {
    return prisma.user.findMany({
      where: { email, active: true, deletedAt: null },
      select: {
        business: {
          select: { id: true, slug: true, name: true, status: true, deletedAt: true },
        },
      },
    });
  },

  findPlatformUserByEmail(email: string) {
    return platformUser().findUnique({
      where: { email },
      select: { id: true, role: true, status: true },
    }) as Promise<{ id: string; role: "SUPERADMIN" | "SUPPORT" | "FINANCE" | "ANALYST"; status: "ACTIVE" | "INACTIVE" } | null>;
  },

  findDefaultBusinessForPlatformLogin() {
    return prisma.business.findFirst({
      where: { deletedAt: null, status: { not: "CANCELLED" } },
      orderBy: { createdAt: "asc" },
      select: { slug: true, name: true, status: true },
    });
  },

  findUserById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: { business: true },
    });
  },

  findPlanForTrial() {
    return prisma.plan.findFirst({ where: { active: true }, orderBy: { price: "asc" } });
  },

  // ── Business + Owner creation ────────────────────────────────────────────────

  createBusinessAndOwner(params: {
    business: {
      name: string;
      slug: string;
      email: string;
      phone: string;
      address: string;
      planId: string;
    };
    user: {
      name: string;
      email: string;
      passwordHash: string;
      role: Role;
    };
  }) {
    return prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          ...params.business,
          status: "TRIAL",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });

      const user = await tx.user.create({
        data: { ...params.user, businessId: business.id },
        select: { id: true, name: true, email: true, role: true, businessId: true },
      });

      await tx.subscription.create({
        data: {
          businessId: business.id,
          planId: params.business.planId,
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: "ACTIVE",
        },
      });

      return { business, user };
    });
  },

  updateLastLogin(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  },

  updateUserPassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  },

  // ── Token revocation ─────────────────────────────────────────────────────────

  createRevokedToken(data: { token: string; userId: string; exp: Date | null }) {
    return prisma.revokedToken.create({ data });
  },

  isTokenRevoked(token: string) {
    return prisma.revokedToken.findUnique({ where: { token } });
  },

  // ── Refresh tokens ────────────────────────────────────────────────────────────

  createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.refreshToken.create({ data });
  },

  findRefreshToken(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { business: true } } },
    });
  },

  markRefreshTokenUsed(id: string) {
    return prisma.refreshToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },

  revokeAllUserRefreshTokens(userId: string) {
    return prisma.refreshToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  },

  // ── Password reset tokens ────────────────────────────────────────────────────

  createPasswordResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.passwordResetToken.create({ data });
  },

  findPasswordResetToken(tokenHash: string) {
    return prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  },

  markPasswordResetTokenUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { used: true, usedAt: new Date() },
    });
  },

  invalidatePreviousResetTokens(userId: string) {
    return prisma.passwordResetToken.updateMany({
      where: { userId, used: false },
      data: { used: true, usedAt: new Date() },
    });
  },

  // ── Password history ─────────────────────────────────────────────────────────

  findPasswordHistory(userId: string, limit = 3) {
    return prisma.passwordHistory.findMany({
      where: { userId },
      orderBy: { changedAt: "desc" },
      take: limit,
      select: { passwordHash: true },
    });
  },

  createPasswordHistory(data: {
    userId: string;
    passwordHash: string;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
  }) {
    return prisma.passwordHistory.create({ data });
  },
};
