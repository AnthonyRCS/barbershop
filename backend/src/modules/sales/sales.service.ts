import { prisma } from "../../lib/prisma.js";
import { CreateCashClosingSchema, CreateSaleSchema } from "./sales.schema.js";
import { salesRepository } from "./sales.repository.js";

export const salesService = {
  listSales(businessId: string) {
    return salesRepository.listSales(businessId);
  },
  listCashClosings(businessId: string) {
    return salesRepository.listCashClosings(businessId);
  },
  async createSale(businessId: string, userId: string, data: unknown) {
    const payload = CreateSaleSchema.parse(data);
    const subtotal = payload.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
    const total = Math.max(0, subtotal - payload.discount);

    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          businessId,
          customerId: payload.customerId,
          subtotal: subtotal.toString(),
          discount: payload.discount.toString(),
          total: total.toString(),
          paymentMethod: payload.paymentMethod,
          notes: payload.notes,
          createdById: userId,
        },
      });

      const items = await Promise.all(
        payload.items.map((item) =>
          tx.saleItem.create({
            data: {
              saleId: sale.id,
              businessId,
              itemType: item.itemType,
              serviceId: item.serviceId,
              productId: item.productId,
              barberId: item.barberId,
              customerId: item.customerId ?? payload.customerId,
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice.toString(),
              totalPrice: (item.unitPrice * item.quantity).toString(),
            },
          }),
        ),
      );

      for (const item of payload.items) {
        if (item.productId) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } });
          await tx.stockMovement.create({
            data: {
              businessId,
              productId: item.productId,
              type: "OUT",
              quantity: item.quantity,
              reason: `Sale ${sale.id}`,
              createdById: userId,
            },
          });
        }
      }

      return { sale, items };
    });
  },
  async createCashClosing(businessId: string, userId: string, data: unknown) {
    const payload = CreateCashClosingSchema.parse(data);
    const totals = await prisma.sale.aggregate({
      where: { businessId, paymentMethod: "CASH", deletedAt: null, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      _sum: { total: true },
    });
    const expectedCash = Number(totals._sum.total ?? 0) + payload.openingCash;
    const difference = payload.countedCash - expectedCash;

    return prisma.cashClosing.create({
      data: {
        businessId,
        userId,
        openingCash: payload.openingCash.toString(),
        expectedCash: expectedCash.toString(),
        countedCash: payload.countedCash.toString(),
        difference: difference.toString(),
        closedAt: new Date(),
        notes: payload.notes,
      },
    });
  },
};
