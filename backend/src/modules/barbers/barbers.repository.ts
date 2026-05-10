import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

const barberWithUserInclude = {
  _count: { select: { appointments: true } },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      photoUrl: true,
      lastLoginAt: true,
      createdAt: true,
    },
  },
} satisfies Prisma.BarberInclude;

export const barbersRepository = {
  list(businessId: string) {
    return prisma.barber.findMany({
      where: { businessId, deletedAt: null },
      include: barberWithUserInclude,
      orderBy: { createdAt: "desc" },
    });
  },
  getById(id: string, businessId: string) {
    return prisma.barber.findFirst({
      where: { id, businessId, deletedAt: null },
      include: barberWithUserInclude,
    });
  },
  create(data: Prisma.BarberUncheckedCreateInput) {
    return prisma.barber.create({
      data,
      include: barberWithUserInclude,
    });
  },
  update(id: string, businessId: string, data: Prisma.BarberUpdateInput) {
    return prisma.barber.updateMany({ where: { id, businessId, deletedAt: null }, data });
  },
  softDelete(id: string, businessId: string) {
    return prisma.barber.updateMany({ where: { id, businessId, deletedAt: null }, data: { deletedAt: new Date() } });
  },
  countActive(businessId: string) {
    return prisma.barber.count({ where: { businessId, deletedAt: null, active: true } });
  },
  findBusinessWithPlan(businessId: string) {
    return prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      include: { plan: true },
    });
  },
  findUserById(id: string, businessId: string) {
    return prisma.user.findFirst({
      where: { id, businessId, deletedAt: null },
      select: { id: true, active: true, role: true },
    });
  },
  findUserByEmail(email: string, businessId: string) {
    return prisma.user.findFirst({
      where: { email, businessId, deletedAt: null },
      select: { id: true, email: true, role: true, active: true },
    });
  },
  createUser(data: {
    businessId: string;
    name: string;
    email: string;
    passwordHash: string;
    role: "OWNER" | "ADMIN" | "BARBER" | "RECEPTIONIST";
    active: boolean;
    photoUrl?: string | null;
  }) {
    return prisma.user.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        photoUrl: true,
        createdAt: true,
      },
    });
  },
  updateUserPhoto(id: string, businessId: string, photoUrl: string | null) {
    return prisma.user.updateMany({
      where: { id, businessId, deletedAt: null },
      data: { photoUrl },
    });
  },
  findBarberByUserId(userId: string, businessId: string) {
    return prisma.barber.findFirst({
      where: { userId, businessId, deletedAt: null },
      select: { id: true },
    });
  },
  listAvailableUsers(businessId: string, search?: string) {
    return prisma.user.findMany({
      where: {
        businessId,
        deletedAt: null,
        barber: null,
        OR: search
          ? [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { id: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        photoUrl: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: [{ active: "desc" }, { name: "asc" }],
      take: 20,
    });
  },
};
