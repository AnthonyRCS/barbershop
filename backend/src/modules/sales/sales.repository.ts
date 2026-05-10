import { prisma } from "../../lib/prisma.js";

export const salesRepository = {
  listSales(businessId: string) {
    return prisma.sale.findMany({
      where: { businessId, deletedAt: null },
      include: { items: true, customer: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  },
  listCashClosings(businessId: string) {
    return prisma.cashClosing.findMany({
      where: { businessId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { openedAt: "desc" },
      take: 100,
    });
  },
};
