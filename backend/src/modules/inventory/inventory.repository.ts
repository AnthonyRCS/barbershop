import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const inventoryRepository = {
  listProducts(businessId: string) {
    return prisma.product.findMany({ where: { businessId, deletedAt: null }, orderBy: { createdAt: "desc" } });
  },
  getProduct(id: string, businessId: string) {
    return prisma.product.findFirst({ where: { id, businessId, deletedAt: null } });
  },
  createProduct(data: Prisma.ProductUncheckedCreateInput) {
    return prisma.product.create({ data });
  },
  updateProduct(id: string, businessId: string, data: Prisma.ProductUpdateInput) {
    return prisma.product.updateMany({ where: { id, businessId, deletedAt: null }, data });
  },
  softDeleteProduct(id: string, businessId: string) {
    return prisma.product.updateMany({ where: { id, businessId, deletedAt: null }, data: { deletedAt: new Date(), active: false } });
  },
  createMovement(data: Prisma.StockMovementUncheckedCreateInput) {
    return prisma.stockMovement.create({ data });
  },
  listMovements(businessId: string, limit = 100) {
    return prisma.stockMovement.findMany({
      where: { businessId },
      include: { product: { select: { id: true, name: true, sku: true } }, createdBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },
};
