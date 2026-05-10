"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/shared/Sidebar";
import { SessionUser } from "@/types";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { MobileSidebar } from "@/components/shared/MobileSidebar";
import { TokenRefresher } from "@/components/shared/TokenRefresher";
import { CurrencyProvider } from "@/contexts/CurrencyContext";

export function DashboardLayoutClient({ children, user: serverUser }: { children: React.ReactNode; user: SessionUser }) {
  // Prefer the live client session (includes refreshed tokens + permissions) over the
  // server-rendered snapshot. Fall back to the SSR user while the session is loading.
  const { data: session, status } = useSession();
  const user: SessionUser =
    status === "authenticated" && session?.user
      ? (session.user as unknown as SessionUser)
      : serverUser;

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const [canHover, setCanHover] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    let storedValue = false;
    try {
      if (typeof window !== "undefined") {
        const hasHover = window.matchMedia("(hover: hover)").matches;
        setCanHover(hasHover);
        const stored = localStorage.getItem("sidebar_collapsed");
        if (stored === "true" || stored === "false") {
          storedValue = hasHover ? stored === "true" : false;
        }
      }
    } catch {
      // Ignorar
    } finally {
      setIsCollapsed(storedValue);
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("sidebar_collapsed", String(isCollapsed));
      }
    } catch {}
  }, [isCollapsed, ready]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (mobileSidebarOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
    document.body.style.overflow = "";
    return undefined;
  }, [mobileSidebarOpen]);

  const transitionClass = ready ? "transition-all duration-300" : "";

  return (
    <CurrencyProvider>
    <div className="flex h-[100dvh] min-h-[100svh] overflow-hidden bg-neutral-50 dark:bg-neutral-950">
      <TokenRefresher />
      {/* Desktop Sidebar */}
      <div className="hidden lg:block z-50">
        <Sidebar
          user={user}
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          hoverEnabled={ready && canHover}
        />
      </div>

      {/* Main Content */}
      <main
        className={`flex-1 flex flex-col overflow-hidden ${transitionClass} ${
          isCollapsed ? "lg:pl-28 xl:pl-28" : "lg:pl-[18.5rem] xl:pl-[18.5rem]"
        }`}
      >
        <div className="flex-1 w-full max-w-full overflow-y-auto px-0 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pr-5 xl:pr-7">
          {children}
        </div>
        
        {/* Mobile Nav */}
        <MobileBottomNav user={user} onOpenSidebar={() => setMobileSidebarOpen(true)} />
      </main>

      {/* Mobile Sidebar (Hoisted) */}
      <MobileSidebar
        user={user}
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
    </div>
    </CurrencyProvider>
  );
}
