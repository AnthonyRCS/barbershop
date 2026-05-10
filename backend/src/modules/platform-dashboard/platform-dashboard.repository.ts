import { prisma } from "../../lib/prisma.js";

export const platformDashboardRepository = {
  async getGlobalMetrics() {
    const [
      totalBusinesses,
      activeBusinesses,
      trialBusinesses,
      suspendedBusinesses,
      cancelledBusinesses,
      activeSubscriptions,
      totalAppointments,
    ] = await Promise.all([
      prisma.business.count({ where: { deletedAt: null } }),
      prisma.business.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.business.count({ where: { status: "TRIAL", deletedAt: null } }),
      prisma.business.count({ where: { status: "SUSPENDED", deletedAt: null } }),
      prisma.business.count({ where: { status: "CANCELLED", deletedAt: null } }),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.appointment.count({ where: { deletedAt: null } }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mrr = await (prisma.subscription as any).aggregate({
      _sum: { amount: true },
      where: { status: "ACTIVE" },
    }) as { _sum: { amount: number | null } };

    return {
      totalBusinesses,
      activeBusinesses,
      trialBusinesses,
      suspendedBusinesses,
      cancelledBusinesses,
      activeSubscriptions,
      totalAppointments,
      estimatedMRR: mrr._sum.amount ?? 0,
    };
  },

  async getMonthlyGrowth() {
    const months: { month: string; businesses: number; appointments: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const [businesses, appointments] = await Promise.all([
        prisma.business.count({
          where: { createdAt: { gte: start, lte: end }, deletedAt: null },
        }),
        prisma.appointment.count({
          where: { createdAt: { gte: start, lte: end }, deletedAt: null },
        }),
      ]);

      months.push({
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
        businesses,
        appointments,
      });
    }

    return months;
  },

  async getRecentBusinesses(limit = 8) {
    return prisma.business.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        status: true,
        createdAt: true,
        trialEndsAt: true,
        plan: { select: { name: true } },
        _count: { select: { users: true, barbers: true, appointments: true } },
      },
    });
  },

  async getRecentActivity(limit = 20) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (prisma as any).platformAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        performedBy: { select: { id: true, name: true, email: true, role: true } },
      },
    });
  },

  async getPlanDistribution() {
    return prisma.plan.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        price: true,
        _count: { select: { businesses: true, subscriptions: true } },
      },
    });
  },
};
