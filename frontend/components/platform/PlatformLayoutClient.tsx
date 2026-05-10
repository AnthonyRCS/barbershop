"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { PlatformSidebar } from "./PlatformSidebar";
import { PlatformSessionUser } from "@/types/platform";

export function PlatformLayoutClient({
  children,
  user,
}: {
  children: React.ReactNode;
  user: PlatformSessionUser;
}) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("platform_sidebar_collapsed");
      if (stored === "true" || stored === "false") {
        setIsCollapsed(stored === "true");
      }
    } catch {
      // ignore
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("platform_sidebar_collapsed", String(isCollapsed));
    } catch {}
  }, [isCollapsed, ready]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">
      <div className="hidden lg:block z-50">
        <PlatformSidebar
          user={user}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
        />
      </div>
      {isMobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 lg:hidden"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Cerrar menú"
          />
          <div className="lg:hidden z-50">
            <PlatformSidebar
              user={user}
              isCollapsed={false}
              mode="mobile"
              onClose={() => setIsMobileOpen(false)}
            />
          </div>
        </>
      )}

      <main
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
          isCollapsed ? "lg:pl-20" : "lg:pl-72"
        }`}
      >
        <header className="lg:hidden sticky top-0 z-30 h-14 px-4 border-b border-zinc-800/80 bg-zinc-950/95 backdrop-blur flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-zinc-700/70 text-zinc-200 hover:bg-zinc-800 transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-sm font-semibold text-zinc-200">Platform Admin</p>
          <div className="w-9 h-9" />
        </header>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
