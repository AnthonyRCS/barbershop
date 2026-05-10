import { z } from "zod";

const AppointmentStatusSchema = z.enum(["CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"]);

export const AppointmentFiltersSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
  barberId: z.string().cuid("Invalid barberId").optional(),
  status: z
    .enum(["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"])
    .optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().positive().max(100)),
});

export const CreateAppointmentSchema = z.object({
  customerId: z.string().cuid(),
  barberId: z.string().cuid(),
  serviceId: z.string().cuid(),
  appointmentDate: z.string().datetime(),
  startTime: z.string().datetime(),
  notes: z.string().max(500).optional(),
  idempotencyKey: z.string().uuid("idempotencyKey must be a UUID").optional(),
});

export const UpdateAppointmentSchema = z
  .object({
    customerId: z.string().cuid().optional(),
    barberId: z.string().cuid().optional(),
    serviceId: z.string().cuid().optional(),
    appointmentDate: z.string().datetime().optional(),
    startTime: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
  })
  .extend({
    status: AppointmentStatusSchema.optional(),
    cancelReason: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "CANCELLED" && !data.cancelReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cancelReason"],
        message: "cancelReason is required when status is CANCELLED",
      });
    }
  });

export type AppointmentFilters = z.infer<typeof AppointmentFiltersSchema>;
export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;
