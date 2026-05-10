import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const platformPlansRepository = {
  findAll() {
    return prisma.plan.findMany({
      orderBy: { price: "asc" },
      include: {
        _count: { select: { businesses: true, subscriptions: true } },
      },
    });
  },

  findById(id: string) {
    return prisma.plan.findUnique({
      where: { id },
      include: { _count: { select: { businesses: true, subscriptions: true } } },
    });
  },

  create(data: Prisma.PlanCreateInput) {
    return prisma.plan.create({ data });
  },

  update(id: string, data: Prisma.PlanUpdateInput) {
    return prisma.plan.update({ where: { id }, data });
  },

  toggle(id: string, active: boolean) {
    return prisma.plan.update({ where: { id }, data: { active } });
  },
};
