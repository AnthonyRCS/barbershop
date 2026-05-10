import { z } from "zod";

export const SUPPORTED_CURRENCIES = [
  "ARS", "BOB", "BRL", "CAD", "CLP", "COP", "CRC", "DOP",
  "EUR", "GBP", "GTQ", "HNL", "MXN", "NIO", "PAB", "PEN",
  "PYG", "USD", "UYU", "VES",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const UpdateBusinessSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(6).optional(),
  email: z.string().email().optional(),
  address: z.string().min(5).optional(),
  logoUrl: z.string().url().optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  appointmentIntervalMinutes: z.number().int().min(5).max(120).refine((value) => value % 5 === 0, {
    message: "El intervalo debe ser multiplo de 5",
  }).optional(),
});

export const BusinessHourItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  isOpen: z.boolean(),
});

export const UpdateBusinessHoursSchema = z
  .array(BusinessHourItemSchema)
  .length(7, "Se requieren exactamente 7 días");

export type BusinessHourItem = z.infer<typeof BusinessHourItemSchema>;
