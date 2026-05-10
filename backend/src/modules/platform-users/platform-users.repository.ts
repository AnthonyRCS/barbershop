import { prisma } from "../../lib/prisma.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pu = () => (prisma as any).platformUser;

const safeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const platformUsersRepository = {
  findAll() {
    return pu().findMany({ select: safeSelect, orderBy: { createdAt: "desc" } });
  },

  findById(id: string) {
    return pu().findUnique({ where: { id }, select: safeSelect });
  },

  findByEmail(email: string) {
    return pu().findUnique({ where: { email }, select: { id: true } });
  },

  create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: string;
    status?: string;
  }) {
    return pu().create({ data, select: safeSelect });
  },

  update(id: string, data: Record<string, unknown>) {
    return pu().update({ where: { id }, data, select: safeSelect });
  },
};
