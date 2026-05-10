import { z } from "zod";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Strip spaces, keep digits and leading + */
function normalizePhone(p: string): string {
  return p.replace(/\s+/g, "").replace(/[^\d+]/g, "");
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const CreateCustomerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100).trim(),
  photoUrl: z.string().url("URL de foto invalida").max(500).optional().nullable(),
  phone: z
    .string()
    .min(6, "Teléfono muy corto")
    .max(40, "Teléfono muy largo")
    .transform(normalizePhone)
    .optional()
    .nullable(),
  email: z
    .string()
    .email("Email inválido")
    .max(200)
    .transform((v) => v.toLowerCase().trim())
    .optional()
    .nullable(),
  notes: z.string().max(1000).trim().optional().nullable(),
  birthDate: z.string().datetime({ message: "Fecha inválida" }).optional().nullable(),
  preferredBarberId: z.string().cuid("ID de barbero inválido").optional().nullable(),
});

export const UpdateCustomerSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  photoUrl: z.string().url("URL de foto invalida").max(500).optional().nullable(),
  phone: z
    .string()
    .min(6)
    .max(40)
    .transform(normalizePhone)
    .optional()
    .nullable(),
  email: z
    .string()
    .email()
    .max(200)
    .transform((v) => v.toLowerCase().trim())
    .optional()
    .nullable(),
  notes: z.string().max(1000).trim().optional().nullable(),
  birthDate: z.string().datetime().optional().nullable(),
  preferredBarberId: z.string().cuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const CustomerListQuerySchema = z.object({
  search: z.string().max(100).trim().optional(),
  isActive: z
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
    .transform((v) => (v ? parseInt(v, 10) : 20))
    .pipe(z.number().int().positive().max(100)),
  sortBy: z
    .enum(["name", "lastVisitAt", "totalVisits", "totalSpent", "createdAt"])
    .optional()
    .default("createdAt"),
  sortDir: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const LookupCustomerSchema = z
  .object({
    phone: z.string().max(40).transform(normalizePhone).optional(),
    email: z
      .string()
      .email()
      .max(200)
      .transform((v) => v.toLowerCase().trim())
      .optional(),
    excludeId: z.string().cuid().optional(),
  })
  .refine((d) => d.phone || d.email, {
    message: "Proporciona al menos teléfono o email",
  });

export const HistoryQuerySchema = z.object({
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

export const InvitePortalSchema = z.object({
  customerId: z.string().cuid("ID de cliente invalido"),
  email: z.string().email("Email invalido").max(200).transform((v) => v.toLowerCase().trim()),
});

export type CreateCustomerInput = z.infer<typeof CreateCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof UpdateCustomerSchema>;
export type CustomerListQuery = z.infer<typeof CustomerListQuerySchema>;
export type LookupCustomerInput = z.infer<typeof LookupCustomerSchema>;
export type HistoryQuery = z.infer<typeof HistoryQuerySchema>;
export type InvitePortalInput = z.infer<typeof InvitePortalSchema>;
