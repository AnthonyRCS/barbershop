import { z } from "zod";

export const CreateProductSchema = z.object({
  name: z.string().min(2).max(120),
  sku: z.string().min(2).max(64).optional(),
  description: z.string().max(500).optional(),
  stock: z.number().int().min(0).default(0),
  minStock: z.number().int().min(0).default(0),
  unitCost: z.number().min(0),
  salePrice: z.number().min(0),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const StockMovementSchema = z.object({
  productId: z.string().cuid(),
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.number().int().positive(),
  reason: z.string().max(200).optional(),
});
