import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3001"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("7d"),
  PLATFORM_JWT_SECRET: z.string().min(32),
  PLATFORM_JWT_EXPIRES_IN: z.string().default("8h"),
  FRONTEND_URL: z.string().min(1),
  FRONTEND_APP_URL: z.string().url().optional(),
  // Email (optional — falls back to Ethereal in dev)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  // Customer portal JWT (optional — required only when portal is enabled)
  CUSTOMER_JWT_SECRET: z.string().min(32).optional(),
  CUSTOMER_JWT_EXPIRES_IN: z.string().default("30d"),
  CUSTOMER_CANCEL_MIN_HOURS: z.coerce.number().int().min(0).default(2),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

