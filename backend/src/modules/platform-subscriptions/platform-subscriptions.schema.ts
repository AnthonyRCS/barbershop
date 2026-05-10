import { z } from "zod";

export const subscriptionListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(["ACTIVE", "PAST_DUE", "CANCELLED"]).optional(),
  planId: z.string().optional(),
  businessId: z.string().optional(),
  expiringDays: z.coerce.number().optional(),
  sortBy: z.enum(["createdAt", "endDate", "startDate"]).default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export const subscriptionUpdateSchema = z.object({
  endDate: z.string().datetime().optional(),
  amount: z.number().optional(),
  paymentMethod: z.string().optional(),
  externalRef: z.string().optional(),
});

export const subscriptionStatusSchema = z.object({
  status: z.enum(["ACTIVE", "PAST_DUE", "CANCELLED"]),
  reason: z.string().optional(),
});

export type SubscriptionListQuery = z.infer<typeof subscriptionListQuerySchema>;
export type SubscriptionUpdateInput = z.infer<typeof subscriptionUpdateSchema>;
export type SubscriptionStatusInput = z.infer<typeof subscriptionStatusSchema>;
