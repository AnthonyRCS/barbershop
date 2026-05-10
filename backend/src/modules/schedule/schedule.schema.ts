import { z } from "zod";

export const CreateBlockSchema = z.object({
  barberId: z.string().cuid(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  reason: z.string().max(200).optional(),
});

export const CreateWaitlistSchema = z.object({
  customerId: z.string().cuid(),
  barberId: z.string().cuid().optional(),
  serviceId: z.string().cuid().optional(),
  preferredDate: z.string().datetime().optional(),
  preferredTime: z.string().max(20).optional(),
  notes: z.string().max(300).optional(),
});

export const UpdateWaitlistStatusSchema = z.object({
  status: z.enum(["PENDING", "CONTACTED", "BOOKED", "CANCELLED"]),
});
