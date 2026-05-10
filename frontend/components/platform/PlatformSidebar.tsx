"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  ScrollText,
  ChevronLeft,
  X,
  LogOut,
  Shield,
  BadgeDollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PlatformSessionUser } from "@/types/platform";

const navItems = [
  { id: "dashboard", label: "Dashboard", href: "/platform", icon: LayoutDashboard, segment: "panel" },
  { id: "businesses", label: "Barberías", href: "/platform/businesses", icon: Building2, segment: "gestión" },
  { id: "plans", label: "Planes", href: "/platform/plans", icon: BadgeDollarSign, segment: "gestión" },
  { id: "subscriptions", label: "Suscripciones", href: "/platform/subscriptions", icon: CreditCard, segment: "gestión" },
  { id: "users", label: "Usuarios", href: "/platform/users", icon: Users, segment: "sistema" },
  { id: "audit", label: "Auditoría", href: "/platform/audit-logs", icon: ScrollText, segment: "sistema" },
];

const segmentLabels: Record<string, string> = {
  panel: "Panel",
  gestión: "Gestión",
  sistema: "Sistema",
};

const roleLabel: Record<string, string> = {
  SUPERADMIN: "Superadmin",
  SUPPORT: "Soporte",
  FINANCE: "Finanzas",
  ANALYST: "Analista",
};

export function PlatformSidebar({
  user,
  isCollapsed,
  setIsCollapsed,
  mode = "desktop",
  onClose,
}: {
  user: PlatformSessionUser;
  isCollapsed: boolean;
  setIsCollapsed?: (val: boolean) => void;
  mode?: "desktop" | "mobile";
  onClose?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hoverRef = useRef<number | null>(null);

  async function handleLogout() {
    await fetch("/api/platform-auth/logout", { method: "POST" });
    router.push("/platform/login");
    router.refresh();
  }

  useEffect(() => { setMounted(true); }, []);

  const handleMouseEnter = useCallback(() => {
    if (!setIsCollapsed) return;
    if (hoverRef.current) window.clearTimeout(hoverRef.current);
    hoverRef.current = window.setTimeout(() => {
      setIsCollapsed(false);
    }, 100);
  }, [setIsCollapsed]);

  const handleMouseLeave = useCallback(() => {
    if (!setIsCollapsed) return;
    if (hoverRef.current) window.clearTimeout(hoverRef.current);
    hoverRef.current = window.setTimeout(() => {
      setIsCollapsed(true);
      setUserMenuOpen(false);
    }, 200);
  }, [setIsCollapsed]);

  const firstName = user?.name?.split(" ")[0] ?? "Admin";
  const effectiveRole = roleLabel[user?.role] ?? user?.role;
  const isMobile = mode === "mobile";

  function isActive(href: string) {
    if (href === "/platform") return pathname === "/platform";
    return pathname.startsWith(href);
  }

  return (
    <>
      <aside
        className={cn(
          "fixed z-50 overflow-hidden transition-all duration-300",
          "bg-zinc-950/95 backdrop-blur-xl",
          isMobile
            ? "top-0 left-0 bottom-0 h-screen w-72 rounded-none border-r border-zinc-800/60 shadow-2xl"
            : "top-4 left-4 bottom-4 h-[calc(100vh-2rem)] rounded-2xl border border-zinc-800/60 shadow-2xl",
          !isMobile && (isCollapsed ? "w-[4.5rem]" : "w-64"),
        )}
        onMouseEnter={isMobile ? undefined : handleMouseEnter}
        onMouseLeave={isMobile ? undefined : handleMouseLeave}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={cn("flex items-center justify-between", isCollapsed ? "p-3 py-4 justify-center" : "p-4")}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 flex-shrink-0"
              >
                <Shield className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <p className="text-[14px] font-bold text-white tracking-tight truncate">
                    Platform Admin
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">Control Center</p>
                </div>
              )}
            </div>
            {!isCollapsed && isMobile && onClose && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
                aria-label="Cerrar menú"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            {!isCollapsed && !isMobile && setIsCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="h-px bg-zinc-800/60 mx-3 mb-1" />

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
            {mounted && navItems.map((item, idx) => {
              const showHeader = !isCollapsed && (idx === 0 || navItems[idx - 1]?.segment !== item.segment);
              const active = isActive(item.href);
              return (
                <div key={item.id}>
                  {showHeader && (
                    <div className="px-2 pt-4 pb-1.5 text-[9px] font-bold tracking-widest uppercase text-zinc-600 first:pt-2">
                      {segmentLabels[item.segment]}
                    </div>
                  )}
                  <Link
                    href={item.href as Route}
                    onClick={isMobile ? onClose : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                      active
                        ? "bg-primary/15 text-primary border border-primary/20"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60",
                      isCollapsed && "justify-center px-2",
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <item.icon
                      className={cn("h-4.5 w-4.5 flex-shrink-0", active ? "text-primary" : "text-zinc-500")}
                      size={18}
                    />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="mt-auto border-t border-zinc-800/60 p-3">
            <div className={cn("flex items-center", isCollapsed ? "justify-center" : "justify-between gap-2")}>
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-white">{firstName.charAt(0).toUpperCase()}</span>
                </div>
                {!isCollapsed && (
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-zinc-200 truncate" suppressHydrationWarning>
                      {mounted ? firstName : ""}
                    </p>
                    <p className="text-[10px] text-zinc-500 truncate" suppressHydrationWarning>
                      {mounted ? effectiveRole : ""}
                    </p>
                  </div>
                )}
              </div>
              {!isCollapsed && (
                <button
                  onClick={() => void handleLogout()}
                  className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {userMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
      )}
    </>
  );
}

