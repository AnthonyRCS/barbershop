/**
 * Platform auth — completely independent of NextAuth tenant auth.
 * Uses a simple httpOnly cookie "platform_token" set via API routes.
 * This avoids any CSRF / cookie conflicts with the tenant NextAuth session.
 */

export type PlatformRole = "SUPERADMIN" | "SUPPORT" | "FINANCE" | "ANALYST";

export interface PlatformSessionUser {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
  token: string;
}

export const PLATFORM_COOKIE = "platform_token";
