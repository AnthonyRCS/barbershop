import { env } from "../config/env.js";

const allowedOrigins = env.FRONTEND_URL.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const wildcardOrigins = allowedOrigins.filter((origin) => origin.includes("*"));
const strictOrigins = new Set(allowedOrigins.filter((origin) => !origin.includes("*")));

function matchesWildcard(origin: string): boolean {
  return wildcardOrigins.some((pattern) => {
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`).test(origin);
  });
}

export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  if (strictOrigins.has(origin)) return true;
  if (matchesWildcard(origin)) return true;

  if (
    env.NODE_ENV !== "production" &&
    /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(
      origin,
    )
  ) {
    return true;
  }

  return false;
}

export function getPublicFrontendUrl(): string {
  if (env.FRONTEND_APP_URL) return env.FRONTEND_APP_URL;
  const firstStrict = allowedOrigins.find((origin) => !origin.includes("*"));
  return firstStrict ?? "http://localhost:3000";
}
