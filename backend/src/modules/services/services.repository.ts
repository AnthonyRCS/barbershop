import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const servicesRepository = {
  list(businessId: string, search?: string) {
    return prisma.service.findMany({
      where: {
        businessId,
        deletedAt: null,
        name: search ? { contains: search, mode: "insensitive" } : undefined,
      },
      orderBy: { createdAt: "desc" },
    });
  },
  getById(id: string, businessId: string) {
    return prisma.service.findFirst({ where: { id, businessId, deletedAt: null } });
  },
  create(data: Prisma.ServiceUncheckedCreateInput) {
    return prisma.service.create({ data });
  },
  update(id: string, businessId: string, data: Prisma.ServiceUpdateInput) {
    return prisma.service.updateMany({ where: { id, businessId, deletedAt: null }, data });
  },
  softDelete(id: string, businessId: string) {
    return prisma.service.updateMany({ where: { id, businessId, deletedAt: null }, data: { deletedAt: new Date() } });
  },
};