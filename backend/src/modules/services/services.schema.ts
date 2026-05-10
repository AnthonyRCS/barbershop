import { z } from "zod";

export const CreateServiceSchema = z.object({
  name: z.string().min(2),
  description: z.string().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(480),
  price: z.number().nonnegative(),
  active: z.boolean().default(true),
});

export const UpdateServiceSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  price: z.number().nonnegative().optional(),
  active: z.boolean().optional(),
});
