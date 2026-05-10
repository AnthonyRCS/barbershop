import { prisma } from "../../lib/prisma.js";

export const dashboardService = {
  async summary(businessId: string) {
    const startMonth = new Date();
    startMonth.setDate(1);
    startMonth.setHours(0, 0, 0, 0);

    const [salesMonth, appointmentsToday, noShowsMonth, lowStockProducts, waitlistPending] = await Promise.all([
      prisma.sale.aggregate({ where: { businessId, deletedAt: null, createdAt: { gte: startMonth } }, _sum: { total: true }, _count: true }),
      prisma.appointment.count({ where: { businessId, deletedAt: null, appointmentDate: { gte: new Date(new Date().setHours(0,0,0,0)), lt: new Date(new Date().setHours(24,0,0,0)) } } }),
      prisma.appointment.count({ where: { businessId, deletedAt: null, status: "NO_SHOW", createdAt: { gte: startMonth } } }),
      prisma.product.count({ where: { businessId, deletedAt: null, active: true, stock: { lte: 5 } } }),
      prisma.waitlistEntry.count({ where: { businessId, status: "PENDING" } }),
    ]);

    return {
      salesMonth: { total: Number(salesMonth._sum.total ?? 0), count: salesMonth._count },
      appointmentsToday,
      noShowsMonth,
      lowStockProducts,
      waitlistPending,
    };
  },
};
