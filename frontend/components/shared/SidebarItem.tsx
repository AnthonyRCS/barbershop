"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SidebarItem({
  label,
  icon: Icon,
  href,
  subItems = [],
  basePath,
  isCollapsed = false,
  controlled = false,
  isOpenProp,
  onToggle,
  onNavigate,
  disabled = false,
}: any) {
  const pathname = usePathname();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = controlled ? !!isOpenProp : uncontrolledOpen;
  const [isHovering, setIsHovering] = useState(false);

  const isActive = useMemo(
    () =>
      href
        ? pathname === href || pathname.startsWith(href + '/')
        : basePath
        ? pathname.startsWith(basePath)
        : false,
    [href, basePath, pathname]
  );

  const hasActiveChild = useMemo(() => {
    if (!subItems || subItems.length === 0) return false;
    return subItems.some((item: any) => {
      const subPath = item.path || "";
      if (!subPath) return false;
      const subItemHref = `${basePath || ""}${subPath}`;
      return pathname === subItemHref || pathname.startsWith(subItemHref);
    });
  }, [subItems, basePath, pathname]);

  useEffect(() => {
    if (hasActiveChild) {
      if (controlled) return;
      setUncontrolledOpen(true);
    }
  }, [hasActiveChild, controlled]);

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (subItems.length > 0 && !isCollapsed) {
      e.preventDefault();
      if (controlled) {
        onToggle?.();
      } else {
        setUncontrolledOpen(!uncontrolledOpen);
      }
    }
  };

  const effectiveSubItems = disabled ? [] : subItems;

  return (
    <div
      className="group relative mb-1 w-full"
      onMouseEnter={() => isCollapsed && setIsHovering(true)}
      onMouseLeave={() => isCollapsed && setIsHovering(false)}
    >
      {(isActive || hasActiveChild) && !disabled && !isCollapsed && (
        <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-primary shadow-lg shadow-primary/30" />
      )}
      <Link
        href={(effectiveSubItems.length > 0 || disabled ? "#" : href || "#") as any}
        onClick={handleClick}
        prefetch={!disabled && effectiveSubItems.length === 0}
        className={cn(
          "flex items-center rounded-xl px-3 py-2.5 cursor-pointer transition-all duration-200",
          disabled
            ? "text-neutral-400 dark:text-neutral-600 opacity-60 cursor-not-allowed"
            : isActive || hasActiveChild
            ? "bg-gradient-to-r from-primary to-amber-500 text-primary-foreground shadow-lg shadow-primary/20"
            : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100/80 dark:hover:bg-white/[0.07] hover:translate-x-0.5",
          isCollapsed && "justify-center px-2.5 py-2.5"
        )}
        aria-label={label}
        aria-disabled={disabled}
      >
        {Icon && (
          <Icon
            className={cn(
              "h-5 w-5 flex-shrink-0",
              isCollapsed ? "mx-auto" : "mr-2",
              disabled
                ? "text-neutral-400 dark:text-neutral-600"
                : isActive || hasActiveChild
                ? "text-primary-foreground"
                : "text-neutral-600 dark:text-neutral-400"
            )}
            strokeWidth={isActive || hasActiveChild ? 2 : 1.5}
          />
        )}

        {!isCollapsed && (
          <>
            <span
              className={cn(
                "flex-grow text-sm font-medium",
                (isActive || hasActiveChild) ? "text-primary-foreground" : ""
              )}
            >
              {label}
            </span>
            {effectiveSubItems.length > 0 && (
              <div className="ml-auto">
                {isOpen ? (
                  <ChevronDown
                    className={cn(
                      "h-4 w-4",
                      disabled
                        ? "text-neutral-400 dark:text-neutral-600"
                        : isActive || hasActiveChild
                        ? "text-primary-foreground"
                        : "text-neutral-600 dark:text-neutral-400"
                    )}
                  />
                ) : (
                  <ChevronRight
                    className={cn(
                      "h-4 w-4",
                      disabled
                        ? "text-neutral-400 dark:text-neutral-600"
                        : isActive || hasActiveChild
                        ? "text-primary-foreground"
                        : "text-neutral-600 dark:text-neutral-400"
                    )}
                  />
                )}
              </div>
            )}
          </>
        )}
      </Link>

      {/* Subelementos en modo expandido */}
      {!isCollapsed && !disabled && isOpen && effectiveSubItems.length > 0 && (
        <div className="ml-2 mt-1 space-y-1 border-l-2 border-neutral-200 pl-2 dark:border-neutral-800">
          {effectiveSubItems.map((item: any, index: number) => {
            const subPath = item.path || "";
            const subItemHref = `${basePath || ""}${subPath}`;
            const isSubItemActive =
              pathname === subItemHref || pathname.startsWith(subItemHref);
            const subDisabled = !!item.disabled;

            if (item.subItems && item.subItems.length > 0) {
              return (
                <SidebarItem
                  key={
                    subPath
                      ? subItemHref
                      : `${basePath || ""}::${item.id || item.title || index}`
                  }
                  label={item.title}
                  icon={item.icon}
                  href={subItemHref}
                  basePath={subItemHref}
                  subItems={item.subItems}
                  isCollapsed={isCollapsed}
                  onNavigate={onNavigate}
                  disabled={subDisabled}
                />
              );
            }

            return (
              <Link
                key={
                  subPath
                    ? subItemHref
                    : `${basePath || ""}::${item.id || item.title || index}`
                }
                href={(subDisabled ? "#" : (subPath ? subItemHref : "#")) as any}
                onClick={() => { if (!subDisabled) onNavigate?.(); }}
                prefetch={!subDisabled}
                className={cn(
                  "flex w-full items-center rounded-lg px-2.5 py-2 text-xs transition-all duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/80",
                  subDisabled
                    ? "opacity-60 cursor-not-allowed text-neutral-400 dark:text-neutral-600"
                    : isSubItemActive
                    ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary font-bold"
                    : "text-neutral-600 dark:text-neutral-400"
                )}
                aria-disabled={subDisabled}
              >
                {item.icon && (
                  <item.icon
                    className={cn(
                      "h-3.5 w-3.5 mr-2 flex-shrink-0",
                      subDisabled
                        ? "text-neutral-400 dark:text-neutral-600"
                        : isSubItemActive
                        ? "text-primary"
                        : "text-neutral-500 dark:text-neutral-500"
                    )}
                  />
                )}
                <span className="truncate block">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Flyout en modo colapsado */}
      {isCollapsed && isHovering && subItems.length > 0 && (
        <div className="absolute left-full top-0 z-50 ml-2 min-w-[12rem] rounded-xl border border-neutral-200 bg-white/95 p-2 shadow-2xl backdrop-blur-sm dark:border-neutral-700 dark:bg-neutral-900/95">
          {subItems.map((item: any, index: number) => {
            const subPath = item.path || "";
            const subItemHref = `${basePath || ""}${subPath}`;
            const isSubItemActive =
              pathname === subItemHref || pathname.startsWith(subItemHref);
            const subDisabled = !!item.disabled;

            return (
              <Link
                key={
                  subPath
                    ? subItemHref
                    : `${basePath || ""}::${item.id || item.title || index}`
                }
                href={(subDisabled ? "#" : (subPath ? subItemHref : "#")) as any}
                onClick={() => { if (!subDisabled) onNavigate?.(); }}
                prefetch={!subDisabled}
                className={cn(
                  "flex items-center px-3 py-2 rounded-md text-sm transition-all duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800",
                  subDisabled
                    ? "opacity-60 cursor-not-allowed text-neutral-400 dark:text-neutral-600"
                    : isSubItemActive
                    ? "text-primary font-bold"
                    : "text-neutral-700 dark:text-neutral-300"
                )}
                aria-disabled={subDisabled}
              >
                {item.icon && (
                  <item.icon
                    className={cn(
                      "h-4 w-4 mr-2 flex-shrink-0",
                      subDisabled
                        ? "text-neutral-400 dark:text-neutral-600"
                        : isSubItemActive
                        ? "text-primary"
                        : "text-neutral-500 dark:text-neutral-400"
                    )}
                  />
                )}
                <span className="truncate">
                  {item.title}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
