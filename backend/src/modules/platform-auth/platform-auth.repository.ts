import { prisma } from "../../lib/prisma.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const platformUser = () => (prisma as any).platformUser;

export const platformAuthRepository = {
  findByEmail(email: string) {
    return platformUser().findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        status: true,
      },
    });
  },

  updateLastLogin(id: string) {
    return platformUser().update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  },
};
