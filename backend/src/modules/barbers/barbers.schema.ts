import { z } from "zod";

export const CreateBarberSchema = z.object({
  userId: z.string().cuid(),
  specialty: z.string().max(120).optional(),
  commissionPercentage: z.number().min(0).max(100).default(0),
  active: z.boolean().default(true),
  photoUrl: z.string().url("URL de foto invalida").max(500).optional().nullable(),
});

export const UpdateBarberSchema = z.object({
  specialty: z.string().max(120).optional(),
  commissionPercentage: z.number().min(0).max(100).optional(),
  active: z.boolean().optional(),
  photoUrl: z.string().url("URL de foto invalida").max(500).optional().nullable(),
});

export const OnboardWorkerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(120).optional(),
  role: z.enum(["ADMIN", "BARBER", "RECEPTIONIST"]).default("BARBER"),
  active: z.boolean().default(true),
  createBarberProfile: z.boolean().default(true),
  specialty: z.string().max(120).optional(),
  commissionPercentage: z.number().min(0).max(100).default(0),
  photoUrl: z.string().url("URL de foto invalida").max(500).optional().nullable(),
});
