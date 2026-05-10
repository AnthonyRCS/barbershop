import { z } from "zod";

const SaleItemSchema = z.object({
  itemType: z.enum(["SERVICE", "PRODUCT"]),
  serviceId: z.string().cuid().optional(),
  productId: z.string().cuid().optional(),
  barberId: z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  name: z.string().min(2).max(120),
  quantity: z.number().int().positive(),
  unitPrice: z.number().min(0),
});

export const CreateSaleSchema = z.object({
  customerId: z.string().cuid().optional(),
  discount: z.number().min(0).default(0),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER", "YAPE", "PLIN", "OTHER"]),
  notes: z.string().max(400).optional(),
  items: z.array(SaleItemSchema).min(1),
});

export const CreateCashClosingSchema = z.object({
  openingCash: z.number().min(0),
  countedCash: z.number().min(0),
  notes: z.string().max(300).optional(),
});
