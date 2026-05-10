import { z } from "zod";

export const businessListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["TRIAL", "ACTIVE", "SUSPENDED", "CANCELLED"]).optional(),
  planId: z.string().optional(),
  sortBy: z.enum(["createdAt", "name", "status"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
  trialExpiringSoon: z.coerce.boolean().optional(),
});

export const businessUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export const businessStatusSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "CANCELLED", "TRIAL"]),
  reason: z.string().optional(),
});

export const businessPlanSchema = z.object({
  planId: z.string().min(1),
});

export type BusinessListQuery = z.infer<typeof businessListQuerySchema>;
export type BusinessUpdateInput = z.infer<typeof businessUpdateSchema>;
export type BusinessStatusInput = z.infer<typeof businessStatusSchema>;
export type BusinessPlanInput = z.infer<typeof businessPlanSchema>;
