import { z } from "zod";

const planFeaturesSchema = z.object({
  reports: z.boolean().default(true),
  reminders: z.boolean().default(true),
}).strict();

export const planCreateSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0),
  maxBarbers: z.number().int().min(1),
  maxAppointmentsPerMonth: z.number().int().min(1),
  features: planFeaturesSchema.default({ reports: true, reminders: true }),
  active: z.boolean().default(true),
});

export const planUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.number().min(0).optional(),
  maxBarbers: z.number().int().min(1).optional(),
  maxAppointmentsPerMonth: z.number().int().min(1).optional(),
  features: planFeaturesSchema.optional(),
  active: z.boolean().optional(),
});

export type PlanCreateInput = z.infer<typeof planCreateSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;
