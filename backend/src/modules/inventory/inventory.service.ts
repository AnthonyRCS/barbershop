import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../lib/errors.js";
import { CreateProductSchema, StockMovementSchema, UpdateProductSchema } from "./inventory.schema.js";
import { inventoryRepository } from "./inventory.repository.js";

export const inventoryService = {
  listProducts(businessId: string) {
    return inventoryRepository.listProducts(businessId);
  },
  listMovements(businessId: string) {
    return inventoryRepository.listMovements(businessId);
  },
  async createProduct(businessId: string, data: unknown) {
    const payload = CreateProductSchema.parse(data);
    return inventoryRepository.createProduct({ ...payload, businessId, unitCost: payload.unitCost.toString(), salePrice: payload.salePrice.toString() });
  },
  async updateProduct(id: string, businessId: string, data: unknown) {
    const payload = UpdateProductSchema.parse(data);
    const result = await inventoryRepository.updateProduct(id, businessId, {
      ...payload,
      unitCost: typeof payload.unitCost === "number" ? payload.unitCost.toString() : undefined,
      salePrice: typeof payload.salePrice === "number" ? payload.salePrice.toString() : undefined,
    });
    if (result.count === 0) throw new AppError("PRODUCT_NOT_FOUND", 404);
    return inventoryRepository.getProduct(id, businessId);
  },
  async deleteProduct(id: string, businessId: string) {
    const result = await inventoryRepository.softDeleteProduct(id, businessId);
    if (result.count === 0) throw new AppError("PRODUCT_NOT_FOUND", 404);
  },
  async createMovement(businessId: string, userId: string, data: unknown) {
    const payload = StockMovementSchema.parse(data);
    const product = await inventoryRepository.getProduct(payload.productId, businessId);
    if (!product) throw new AppError("PRODUCT_NOT_FOUND", 404);

    const delta = payload.type === "IN" ? payload.quantity : payload.type === "OUT" ? -payload.quantity : payload.quantity - product.stock;
    if (product.stock + delta < 0) throw new AppError("INSUFFICIENT_STOCK", 409, "Stock insuficiente");

    return prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id: product.id }, data: { stock: product.stock + delta } });
      const movement = await tx.stockMovement.create({
        data: { businessId, productId: product.id, type: payload.type, quantity: payload.quantity, reason: payload.reason, createdById: userId },
      });
      return { updatedProduct: updated, movement };
    });
  },
};
