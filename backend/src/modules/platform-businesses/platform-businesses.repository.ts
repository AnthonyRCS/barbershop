import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { BusinessListQuery } from "./platform-businesses.schema.js";

export const platformBusinessesRepository = {
  async findMany(query: BusinessListQuery) {
    const { page, limit, search, status, planId, sortBy, sortDir, trialExpiringSoon } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BusinessWhereInput = { deletedAt: null };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (status) where.status = status;
    if (planId) where.planId = planId;

    if (trialExpiringSoon) {
      const sevenDays = new Date();
      sevenDays.setDate(sevenDays.getDate() + 7);
      where.status = "TRIAL";
      where.trialEndsAt = { lte: sevenDays };
    }

    const [items, total] = await Promise.all([
      prisma.business.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          trialEndsAt: true,
          plan: { select: { id: true, name: true } },
          _count: {
            select: { users: true, barbers: true, appointments: true },
          },
        },
      }),
      prisma.business.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  findById(id: string) {
    return prisma.business.findFirst({
      where: { id, deletedAt: null },
      include: {
        plan: true,
        subscriptions: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { plan: { select: { name: true } } },
        },
        _count: {
          select: { users: true, barbers: true, services: true, appointments: true, customers: true },
        },
      },
    });
  },

  async getBusinessStats(businessId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [appointmentsThisMonth, lastAuditLog] = await Promise.all([
      prisma.appointment.count({
        where: { businessId, createdAt: { gte: monthStart }, deletedAt: null },
      }),
      prisma.auditLog.findFirst({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, action: true, entity: true },
      }),
    ]);

    return { appointmentsThisMonth, lastActivity: lastAuditLog?.createdAt ?? null };
  },

  update(id: string, data: Prisma.BusinessUpdateInput) {
    return prisma.business.update({ where: { id }, data });
  },

  async changePlan(id: string, planId: string) {
    return prisma.business.update({ where: { id }, data: { planId } });
  },
};
