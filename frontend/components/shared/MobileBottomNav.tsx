"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  LayoutDashboard,
  Menu,
  Settings,
  Sparkles,
  User as UserIcon,
  Users,
} from "lucide-react";
import { SessionUser } from "@/types";
import { hasPermissionWithRoleFallback } from "@/lib/rbac";

type NavItem = {
  id: string;
  title: string;
  href: string;
  icon: React.ElementType;
  permission: string;
};

const ALL_NAV_ITEMS: NavItem[] = [
  { id: "dashboard", title: "Inicio",    href: "/",            icon: LayoutDashboard, permission: "appointments:read" },
  { id: "citas",     title: "Citas",     href: "/appointments",icon: CalendarDays,    permission: "appointments:read" },
  { id: "clientes",  title: "Clientes",  href: "/customers",   icon: Users,           permission: "customers:write" },
  { id: "servicios", title: "Servicios", href: "/services",    icon: Sparkles,        permission: "services:write" },
  { id: "barberos",  title: "Barberos",  href: "/barbers",     icon: UserIcon,        permission: "barbers:write" },
  { id: "ajustes",   title: "Ajustes",   href: "/settings",    icon: Settings,        permission: "business:write" },
];

export function MobileBottomNav({
  user,
  onOpenSidebar,
}: {
  user: SessionUser;
  onOpenSidebar: () => void;
}) {
  const pathname = usePathname();
  const permissions = user?.permissions ?? [];
  const role = user?.role;

  // Filter by permissions, show max 4 items + menu button
  const visibleItems = useMemo(
    () =>
      ALL_NAV_ITEMS.filter((item) =>
        hasPermissionWithRoleFallback(permissions, role, item.permission),
      ).slice(0, 4),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [permissions.join(","), role],
  );

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname?.startsWith(href));

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200/80 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-neutral-950/95 lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="grid h-16 grid-cols-5 px-2">
          {visibleItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.id}
                href={item.href as never}
                className={cn(
                  "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium transition-colors active:bg-neutral-100 dark:active:bg-white/10",
                  active
                    ? "text-primary dark:text-primary"
                    : "text-neutral-500 dark:text-neutral-400",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                <span className="max-w-full truncate">{item.title}</span>
              </Link>
            );
          })}

          <button
            className="flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-medium text-neutral-500 transition-colors active:bg-neutral-100 dark:text-neutral-400 dark:active:bg-white/10"
            onClick={onOpenSidebar}
            type="button"
          >
            <Menu className="h-5 w-5" strokeWidth={2} />
            <span>Menu</span>
          </button>
      </div>
    </div>
  );
}
