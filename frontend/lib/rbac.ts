import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Role } from "@/types";

/**
 * Server-side role guard. Call at the top of any protected page/layout.
 * Redirects to "/" if the current user's role is not in `allowedRoles`.
 */
export async function requireRole(allowedRoles: Role[]): Promise<void> {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  if (!allowedRoles.includes(session.user.role as Role)) {
    redirect("/");
  }
}

/**
 * Returns the current session or redirects to /login if not authenticated.
 */
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

/**
 * Server-side permission check.
 * Uses the `permissions[]` array from the backend — no role hardcoding needed.
 *
 * @example
 * const session = await requireAuth();
 * if (!hasPermission(session.user.permissions, "barbers:write")) redirect("/");
 */
export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes(permission);
}

const LEGACY_ROLE_PERMISSIONS: Record<Role, string[]> = {
  OWNER: [
    "appointments:read",
    "customers:write",
    "barbers:write",
    "services:write",
    "business:write",
  ],
  ADMIN: [
    "appointments:read",
    "customers:write",
    "barbers:write",
    "services:write",
    "business:write",
  ],
  BARBER: ["appointments:read"],
  RECEPTIONIST: ["appointments:read", "customers:write"],
};

/**
 * Backward-compatible permission check:
 * - Uses fine-grained permissions when present.
 * - Falls back to legacy role capabilities for old sessions without permissions[] in JWT.
 */
export function hasPermissionWithRoleFallback(
  permissions: string[] | undefined,
  role: Role | undefined,
  permission: string,
): boolean {
  if ((permissions?.length ?? 0) > 0) {
    return hasPermission(permissions ?? [], permission);
  }

  if (!role) {
    return permission === "appointments:read";
  }

  return LEGACY_ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Server-side guard based on a fine-grained permission string.
 * Redirects to "/" when the user lacks the required permission.
 */
export async function requirePermission(permission: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!hasPermission(session.user.permissions ?? [], permission)) redirect("/");
  return session;
}

/** Roles that can manage business configuration */
export const MANAGE_ROLES: Role[] = ["OWNER", "ADMIN"];

/** Roles that can see and create customers (barbers included — they register clients during appointments) */
export const CUSTOMER_ROLES: Role[] = ["OWNER", "ADMIN", "BARBER", "RECEPTIONIST"];
