import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { SubscriptionListQuery } from "./platform-subscriptions.schema.js";

export const platformSubscriptionsRepository = {
  async findMany(query: SubscriptionListQuery) {
    const { page, limit, status, planId, businessId, expiringDays, sortBy, sortDir } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {};

    if (status) where.status = status;
    if (planId) where.planId = planId;
    if (businessId) where.businessId = businessId;

    if (expiringDays !== undefined) {
      const future = new Date();
      future.setDate(future.getDate() + expiringDays);
      where.endDate = { lte: future };
      where.status = "ACTIVE";
    }

    const [items, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
        include: {
          business: { select: { id: true, name: true, slug: true, status: true } },
          plan: { select: { id: true, name: true, price: true } },
        },
      }),
      prisma.subscription.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  findById(id: string) {
    return prisma.subscription.findUnique({
      where: { id },
      include: {
        business: { select: { id: true, name: true, slug: true, email: true, status: true } },
        plan: true,
      },
    });
  },

  update(id: string, data: Prisma.SubscriptionUpdateInput) {
    return prisma.subscription.update({ where: { id }, data });
  },
};
