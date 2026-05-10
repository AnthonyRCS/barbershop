"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  Scissors,
  Settings,
  Sparkles,
  User as UserIcon,
  Users,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Role, SessionUser } from "@/types";
import { SidebarItem } from "./SidebarItem";
import { hasPermissionWithRoleFallback } from "@/lib/rbac";

// ─── Navigation config ────────────────────────────────────────────────────────

type NavItem = {
  id: string;
  title: string;
  path: string;
  icon: React.ElementType;
  segment: string;
  /** Fine-grained permission required to show this item (from backend permissions[]) */
  permission: string;
};

const allNavigationItems: NavItem[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    segment: "inicio",
    permission: "appointments:read",
  },
  {
    id: "citas",
    title: "Citas",
    path: "/appointments",
    icon: CalendarDays,
    segment: "operacion",
    permission: "appointments:read",
  },
  {
    id: "clientes",
    title: "Clientes",
    path: "/customers",
    icon: Users,
    segment: "operacion",
    permission: "customers:write",
  },
  {
    id: "barberos",
    title: "Barberos",
    path: "/barbers",
    icon: UserIcon,
    segment: "configuracion",
    permission: "barbers:write",
  },
  {
    id: "servicios",
    title: "Servicios",
    path: "/services",
    icon: Sparkles,
    segment: "configuracion",
    permission: "services:write",
  },
  {
    id: "configuracion",
    title: "Configuración",
    path: "/settings",
    icon: Settings,
    segment: "configuracion",
    permission: "business:write",
  },
];

const segmentLabels: Record<string, string> = {
  inicio: "Inicio",
  operacion: "Operación",
  configuracion: "Configuración",
};

const roleLabel: Record<Role, string> = {
  OWNER: "Propietario",
  ADMIN: "Administrador",
  BARBER: "Barbero",
  RECEPTIONIST: "Recepcionista",
};

const roleColors: Record<Role, string> = {
  OWNER: "bg-gradient-to-br from-primary to-amber-500 text-primary-foreground",
  ADMIN: "bg-gradient-to-br from-primary to-amber-500 text-primary-foreground",
  BARBER: "bg-gradient-to-br from-neutral-900 to-neutral-600 text-white dark:from-primary dark:to-amber-500 dark:text-primary-foreground",
  RECEPTIONIST: "bg-gradient-to-br from-emerald-600 to-teal-500 text-white",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar({
  user,
  isCollapsed,
  setIsCollapsed,
  hoverEnabled = true,
}: {
  user: SessionUser;
  isCollapsed: boolean;
  setIsCollapsed?: (val: boolean) => void;
  hoverEnabled?: boolean;
}) {
  const router = useRouter();
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  const firstName = user?.name?.split(" ")[0] || "Usuario";
  const role = user?.role as Role;
  const effectiveRole = roleLabel[role] ?? role ?? "Usuario";
  const iconColor = roleColors[role] ?? "bg-gradient-to-br from-neutral-900 to-neutral-600 text-white";

  // Filter nav items by permissions (fallback to legacy role for old sessions)
  const permissions = user?.permissions ?? [];
  const navigationItems = allNavigationItems.filter((item) =>
    hasPermissionWithRoleFallback(permissions, role, item.permission),
  );

  const handleToggleCollapse = useCallback(() => {
    if (setIsCollapsed) setIsCollapsed(!isCollapsed);
  }, [isCollapsed, setIsCollapsed]);

  const handleMouseEnter = useCallback(() => {
    if (!hoverEnabled || !setIsCollapsed) return;
    if (isCollapsed) setIsCollapsed(false);
  }, [hoverEnabled, isCollapsed, setIsCollapsed]);

  const handleMouseLeave = useCallback(() => {
    if (!hoverEnabled || !setIsCollapsed) return;
    if (!isCollapsed) setIsCollapsed(true);
    setOpenItemId(null);
  }, [hoverEnabled, isCollapsed, setIsCollapsed]);

  useEffect(() => {
    if (isCollapsed) setOpenItemId(null);
  }, [isCollapsed]);

  return (
    <aside
      className={cn(
        "premium-card fixed left-4 top-4 bottom-4 z-50 h-[calc(100svh-2rem)] max-h-[calc(100dvh-2rem)] overflow-hidden rounded-[1.65rem] ring-1 ring-white/40 dark:ring-white/10",
        "transition-all duration-300",
        isCollapsed ? "w-[4.5rem]" : "w-64"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-primary/18 via-primary/5 to-transparent" />
      <div className="pointer-events-none absolute -right-16 top-16 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className={cn("flex items-center justify-between", isCollapsed ? "p-3" : "p-4")}>
          <button
            className={cn(
              "premium-glow flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm",
              iconColor
            )}
            onClick={() => router.push("/")}
            title="Ir al dashboard"
          >
            <Scissors className="h-5 w-5" />
          </button>

          {isCollapsed ? (
            <button
              onClick={handleToggleCollapse}
              className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              title="Expandir menú"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-bold tracking-tight text-neutral-800 dark:text-white">
                  {user.businessName ?? "Barbershop"}
                </p>
                <p className="truncate text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {effectiveRole}
                </p>
              </div>
              <button
                onClick={handleToggleCollapse}
                className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
                title="Colapsar menú"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="premium-hairline my-1 h-px w-full opacity-70" />

        {/* Navigation */}
        <div className="no-scrollbar flex-1 overflow-y-auto overscroll-contain px-2 py-2">
          <nav className="space-y-1">
            {navigationItems.map((item, idx) => {
              const showSegmentHeader =
                !isCollapsed &&
                (idx === 0 || navigationItems[idx - 1]?.segment !== item.segment);
              return (
                <div key={item.id}>
                  {showSegmentHeader ? (
                    <div className="px-3 pb-2 pt-3 text-[10px] font-bold uppercase tracking-[0.24em] text-neutral-400/80 dark:text-neutral-500">
                      {segmentLabels[item.segment] ?? item.segment}
                    </div>
                  ) : null}
                  <SidebarItem
                    label={item.title}
                    icon={item.icon}
                    href={item.path}
                    subItems={[]}
                    isCollapsed={isCollapsed}
                    basePath={item.path}
                    controlled
                    isOpenProp={openItemId === item.id}
                    onToggle={() =>
                      setOpenItemId((prev) => (prev === item.id ? null : item.id))
                    }
                    onNavigate={() => setOpenItemId(null)}
                  />
                </div>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        <div
          className={cn(
            "mt-auto border-t border-neutral-200/60 bg-white/40 p-2 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]",
            !isCollapsed && "p-3"
          )}
        >
          {isCollapsed ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleToggleCollapse}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                title="Expandir menú"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => void signOut({ redirectTo: "/login" })}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={cn(
                    "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-sm",
                    iconColor
                  )}
                >
                  {firstName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    {firstName}
                  </p>
                  <p className="truncate text-[10px] text-neutral-500 dark:text-neutral-400">
                    {effectiveRole}
                  </p>
                </div>
              </div>
              <button
                onClick={() => void signOut({ redirectTo: "/login" })}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                title="Cerrar sesión"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-xs">Salir</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

