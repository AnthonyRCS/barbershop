import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { BusinessHourItem } from "./business.schema.js";

export const businessRepository = {
  getById(businessId: string) {
    return prisma.business.findFirst({
      where: { id: businessId, deletedAt: null },
      include: {
        plan: true,
        subscriptions: { where: { status: "ACTIVE" }, include: { plan: true }, take: 1 },
      },
    });
  },
  update(businessId: string, data: Prisma.BusinessUpdateInput) {
    return prisma.business.updateMany({ where: { id: businessId, deletedAt: null }, data });
  },
  getHours(businessId: string) {
    return prisma.businessHours.findMany({
      where: { businessId },
      orderBy: { dayOfWeek: "asc" },
    });
  },
  upsertHours(businessId: string, hours: BusinessHourItem[]) {
    return prisma.$transaction(
      hours.map((h) =>
        prisma.businessHours.upsert({
          where: { businessId_dayOfWeek: { businessId, dayOfWeek: h.dayOfWeek } },
          update: { openTime: h.openTime, closeTime: h.closeTime, isOpen: h.isOpen },
          create: {
            businessId,
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime,
            closeTime: h.closeTime,
            isOpen: h.isOpen,
          },
        }),
      ),
    );
  },
};