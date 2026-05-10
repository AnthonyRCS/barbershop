import { z } from "zod";

export const platformUserCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["SUPERADMIN", "SUPPORT", "FINANCE", "ANALYST"]),
});

export const platformUserUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["SUPERADMIN", "SUPPORT", "FINANCE", "ANALYST"]).optional(),
});

export const platformUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export type PlatformUserCreateInput = z.infer<typeof platformUserCreateSchema>;
export type PlatformUserUpdateInput = z.infer<typeof platformUserUpdateSchema>;
export type PlatformUserStatusInput = z.infer<typeof platformUserStatusSchema>;
