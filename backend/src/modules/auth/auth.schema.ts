import { z } from "zod";

export const RegisterSchema = z.object({
  businessName: z.string().min(2),
  businessSlug: z.string().min(2),
  businessEmail: z.string().email(),
  businessPhone: z.string().regex(/^\+[1-9]\d{7,14}$/, "Invalid international phone format"),
  businessAddress: z.string().min(5),
  countryCode: z.string().length(2).optional(),
  dialCode: z.string().regex(/^\+\d{1,4}$/).optional(),
  currency: z.string().min(3).max(3).optional(),
  locale: z.string().min(2).max(10).optional(),
  timezone: z.string().min(3).max(64).optional(),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["OWNER", "ADMIN", "BARBER", "RECEPTIONIST"]).default("OWNER"),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  businessSlug: z.string().min(2).optional(),
});

export const LookupEmailSchema = z.object({
  email: z.string().email(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email(),
  businessSlug: z.string().min(2),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  passwordConfirm: z.string().min(8),
}).refine((d) => d.password === d.passwordConfirm, {
  message: "Las contraseñas no coinciden",
  path: ["passwordConfirm"],
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  newPasswordConfirm: z.string().min(8),
}).refine((d) => d.newPassword === d.newPasswordConfirm, {
  message: "Las contraseñas no coinciden",
  path: ["newPasswordConfirm"],
});

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "refreshToken is required"),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type LookupEmailInput = z.infer<typeof LookupEmailSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
