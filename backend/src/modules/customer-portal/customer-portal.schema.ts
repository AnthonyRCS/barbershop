import { z } from "zod";

export const PortalRegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100).trim(),
});

export const PortalLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const PortalClaimAccountSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100).trim().optional(),
});

export const PortalVerifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const PortalUpdateMeSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  phone: z.string().min(6).max(40).optional().nullable(),
  birthDate: z.string().datetime().optional().nullable(),
});

export const PortalAppointmentsQuerySchema = z.object({
  upcoming: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .pipe(z.number().int().positive().max(50)),
});

export const PortalRequestAppointmentSchema = z.object({
  serviceId: z.string().cuid(),
  barberId: z.string().cuid(),
  startTime: z
    .string()
    .datetime()
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: "La fecha y hora debe ser futura",
    }),
  notes: z.string().max(500).optional(),
});

export const PortalAvailabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha debe tener formato YYYY-MM-DD"),
  barberId: z.string().cuid(),
  serviceId: z.string().cuid(),
});

export const PortalCancelAppointmentParamsSchema = z.object({
  id: z.string().cuid(),
});

export type PortalRegisterInput = z.infer<typeof PortalRegisterSchema>;
export type PortalLoginInput = z.infer<typeof PortalLoginSchema>;
export type PortalClaimAccountInput = z.infer<typeof PortalClaimAccountSchema>;
export type PortalVerifyEmailInput = z.infer<typeof PortalVerifyEmailSchema>;
export type PortalUpdateMeInput = z.infer<typeof PortalUpdateMeSchema>;
export type PortalAppointmentsQuery = z.infer<typeof PortalAppointmentsQuerySchema>;
export type PortalRequestAppointmentInput = z.infer<typeof PortalRequestAppointmentSchema>;
export type PortalCancelAppointmentParams = z.infer<typeof PortalCancelAppointmentParamsSchema>;
export type PortalAvailabilityQuery = z.infer<typeof PortalAvailabilityQuerySchema>;
