"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  LayoutDashboard,
  LogOut,
  Scissors,
  Settings,
  Sparkles,
  User,
  User as UserIcon,
  Users,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { Role, SessionUser } from "@/types";

// ─── Navigation config (same as desktop Sidebar) ─────────────────────────────

type NavItem = {
  id: string;
  title: string;
  href: string;
  icon: React.ElementType;
  segment: string;
  roles: Role[];
};

const ALL_ROLES: Role[] = ["OWNER", "ADMIN", "BARBER", "RECEPTIONIST"];
const MANAGE_ROLES: Role[] = ["OWNER", "ADMIN"];

const ALL_NAV_ITEMS: NavItem[] = [
  { id: "dashboard",      title: "Dashboard",     href: "/",            icon: LayoutDashboard, segment: "inicio",         roles: ALL_ROLES },
  { id: "citas",          title: "Citas",          href: "/appointments",icon: CalendarDays,    segment: "operacion",      roles: ALL_ROLES },
  { id: "clientes",       title: "Clientes",       href: "/customers",   icon: Users,           segment: "operacion",      roles: ["OWNER", "ADMIN", "RECEPTIONIST"] },
  { id: "barberos",       title: "Barberos",       href: "/barbers",     icon: UserIcon,        segment: "configuracion",  roles: MANAGE_ROLES },
  { id: "servicios",      title: "Servicios",      href: "/services",    icon: Sparkles,        segment: "configuracion",  roles: MANAGE_ROLES },
  { id: "configuracion",  title: "Configuración",  href: "/settings",    icon: Settings,        segment: "configuracion",  roles: ["OWNER"] },
];

const SEGMENT_LABELS: Record<string, string> = {
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
  OWNER: "bg-primary shadow-indigo-500/30",
  ADMIN: "bg-primary shadow-violet-500/30",
  BARBER: "bg-blue-600 shadow-blue-500/30",
  RECEPTIONIST: "bg-teal-600 shadow-teal-500/30",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MobileSidebar({
  open,
  onClose,
  user,
}: {
  open: boolean;
  onClose: () => void;
  user: SessionUser;
}) {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const role = user?.role as Role;
  const userName = user?.name || "Usuario";
  const userRoleDisplay = roleLabel[role] ?? role ?? "Usuario";
  const avatarColor = roleColors[role] ?? "bg-blue-600 shadow-blue-500/30";

  // Filter items by role
  const navigationItems = useMemo(
    () => ALL_NAV_ITEMS.filter((item) => item.roles.includes(role)),
    [role]
  );

  // Group by segment
  const groupedMenu = useMemo(() => {
    return navigationItems.reduce(
      (acc, item) => {
        const existing = acc.find((g) => g.segment === item.segment);
        if (existing) {
          existing.items.push(item);
        } else {
          acc.push({ segment: item.segment, items: [item] });
        }
        return acc;
      },
      [] as { segment: string; items: NavItem[] }[]
    );
  }, [navigationItems]);

  const isActive = (href: string) => {
    if (!href || href === "#") return false;
    if (pathname === href) return true;
    if (href !== "/" && pathname?.startsWith(href)) return true;
    return false;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Panel */}
          <motion.div
            className="absolute inset-y-0 left-0 z-[101] flex w-[min(22rem,86vw)] max-w-[86vw] flex-col overflow-hidden border-r border-neutral-200 bg-white shadow-2xl dark:border-white/10 dark:bg-neutral-950"
            initial={{ x: "-105%" }}
            animate={{ x: 0 }}
            exit={{ x: "-105%" }}
            transition={{ type: "spring", damping: 28, stiffness: 360, mass: 0.9 }}
            style={{
              paddingTop: "max(env(safe-area-inset-top), 1.25rem)",
              paddingBottom: "max(env(safe-area-inset-bottom), 1.25rem)",
            }}
          >
            {/* Header */}
            <div className="relative px-5 py-4 pb-3">
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-extrabold text-white shadow-sm",
                    avatarColor
                  )}
                >
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-neutral-900 dark:text-white font-bold text-base tracking-tight truncate">
                    {userName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <p className="text-neutral-500 dark:text-neutral-400 text-[10px] font-semibold uppercase tracking-wider">
                      {userRoleDisplay}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 transition-colors active:bg-neutral-200 dark:bg-white/10 dark:text-neutral-300 dark:active:bg-white/15"
                  type="button"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>

              {/* Business name */}
              {user.businessName && (
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-neutral-100 px-3 py-2 dark:bg-white/5">
                  <Scissors className="h-3.5 w-3.5 text-neutral-400" />
                  <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400 truncate">
                    {user.businessName}
                  </span>
                </div>
              )}
            </div>

            <div className="mx-4 h-px bg-neutral-100 dark:bg-white/5" />

            {/* Navigation */}
            <div className="no-scrollbar flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-3">
              {groupedMenu.map((group) => (
                <div key={group.segment}>
                  <p className="px-2 mb-1.5 text-[10px] uppercase tracking-[0.2em] text-neutral-400/80 dark:text-neutral-500 font-bold">
                    {SEGMENT_LABELS[group.segment] ?? group.segment}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.id}
                          href={item.href as never}
                          onClick={onClose}
                          className={cn(
                            "flex min-h-12 items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors",
                            active
                              ? "bg-primary text-white shadow-sm"
                              : "text-neutral-700 active:bg-neutral-100 dark:text-neutral-300 dark:active:bg-white/5"
                          )}
                        >
                          <Icon
                            className={cn(
                              "w-4.5 h-4.5 flex-shrink-0",
                              active
                                ? "text-blue-400 dark:text-blue-600"
                                : "text-neutral-400 dark:text-neutral-500"
                            )}
                          />
                          {item.title}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mx-4 h-px bg-neutral-100 dark:bg-white/5" />

            {/* Footer */}
            <div className="p-3">
              <button
                onClick={() => setIsProfileOpen((v) => !v)}
                className="flex w-full min-h-12 items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 transition-colors active:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:active:bg-white/10"
                type="button"
              >
                <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
                  <User className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-neutral-900 dark:text-white text-sm font-semibold truncate">{userName}</p>
                  <p className="text-neutral-400 text-[10px] uppercase tracking-wider font-semibold">{userRoleDisplay}</p>
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-neutral-400 transition-transform duration-300",
                    isProfileOpen && "rotate-180"
                  )}
                />
              </button>

              <div
                className={cn(
                  "grid transition-all duration-300",
                  isProfileOpen ? "grid-rows-[1fr] opacity-100 pt-2" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden">
                  <div className="space-y-0.5 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg dark:border-white/10 dark:bg-neutral-900/80">
                    <Link
                      href={"/settings" as never}
                      onClick={onClose}
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 transition-colors active:bg-neutral-100 dark:text-neutral-300 dark:active:bg-white/5"
                    >
                      <Settings className="w-4 h-4 text-neutral-400" />
                      Configuración
                    </Link>
                    <button
                      onClick={() => void signOut({ redirectTo: "/login" })}
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-red-600 transition-colors active:bg-red-50 dark:text-red-400 dark:active:bg-red-900/10"
                      type="button"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

