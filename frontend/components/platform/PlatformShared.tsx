"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { BusinessStatus, SubscriptionStatus, PlatformUserStatus } from "@/types/platform";
import { cn } from "@/lib/utils";

// Status Badges
const businessStatusConfig: Record<BusinessStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Activa", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  TRIAL: { label: "Trial", className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  SUSPENDED: { label: "Suspendida", className: "bg-orange-500/15 text-orange-400 border-orange-500/20" },
  CANCELLED: { label: "Cancelada", className: "bg-red-500/15 text-red-400 border-red-500/20" },
};

const subscriptionStatusConfig: Record<SubscriptionStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Activa", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  PAST_DUE: { label: "Vencida", className: "bg-red-500/15 text-red-400 border-red-500/20" },
  CANCELLED: { label: "Cancelada", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
};

const platformUserStatusConfig: Record<PlatformUserStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Activo", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  INACTIVE: { label: "Inactivo", className: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
};

export function StatusBadge({ status }: { status: BusinessStatus }) {
  const cfg = businessStatusConfig[status];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border", cfg.className)}>
      {cfg.label}
    </span>
  );
}

export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  const cfg = subscriptionStatusConfig[status];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border", cfg.className)}>
      {cfg.label}
    </span>
  );
}

export function PlatformUserStatusBadge({ status }: { status: PlatformUserStatus }) {
  const cfg = platformUserStatusConfig[status];
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border", cfg.className)}>
      {cfg.label}
    </span>
  );
}

// Utilities
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PE", { style: "currency", currency: "USD" }).format(amount);
}

// Page header
export function PlatformPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        {description && <p className="text-sm text-zinc-500 mt-0.5">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// Card container
export function PlatformCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-zinc-900/70 border border-zinc-800 rounded-2xl", className)}>
      {children}
    </div>
  );
}

// Empty state
export function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-16 text-center">
      <p className="text-zinc-600 text-sm">{message}</p>
    </div>
  );
}

// Loading skeleton rows
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`grid gap-4 animate-pulse`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, j) => (
            <div key={j} className="h-8 bg-zinc-800 rounded-lg" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Responsive modal for platform forms (dialog on desktop, bottom-sheet on mobile)
export function PlatformResponsiveModal({
  open,
  title,
  onClose,
  children,
  footer,
  maxWidthClass = "sm:max-w-2xl",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidthClass?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const modalNode = (
    <div className="fixed inset-0 z-[2147483000] flex items-end sm:items-center sm:justify-center">
      <button
        type="button"
        aria-label="Cerrar modal"
        className="absolute inset-0 bg-black/78 backdrop-blur-xl"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative border border-indigo-400/20 overflow-hidden",
          "bg-surface-veil backdrop-blur-2xl",
          "shadow-soft-lg",
          "w-[calc(100%-0.75rem)] sm:w-[min(92vw,56rem)] mb-1.5 sm:mb-0",
          "rounded-3xl sm:rounded-2xl",
          "max-h-[calc(100dvh-1cm)] sm:max-h-[90dvh]",
          "pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:pb-0",
          maxWidthClass,
        )}
      >
        <div className="sm:hidden mx-auto mt-3 mb-2 h-1.5 w-12 rounded-full bg-white/25" />
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-white/[0.03]">
          <h2 className="text-sm sm:text-base font-semibold text-zinc-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 max-h-[calc(100dvh-1cm-8.5rem)] sm:max-h-[calc(90dvh-9rem)]">
          {children}
        </div>

        {footer ? (
          <div className="border-t border-white/10 px-4 sm:px-6 py-3 bg-white/[0.03]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}

// Confirmation Modal
export function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  variant = "danger",
  loading = false,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning";
  loading?: boolean;
}) {
  const confirmClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-500 text-white"
      : "bg-amber-600 hover:bg-amber-500 text-white";

  return (
    <PlatformResponsiveModal
      open={open}
      title={title}
      onClose={onCancel}
      maxWidthClass="sm:max-w-md"
      footer={
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2 text-sm text-zinc-300 hover:text-zinc-100 transition-colors rounded-xl hover:bg-zinc-800"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-xl transition-all disabled:opacity-50",
              confirmClass,
            )}
          >
            {loading ? "Procesando..." : "Confirmar"}
          </button>
        </div>
      }
    >
      <p className="text-sm text-zinc-400">{message}</p>
    </PlatformResponsiveModal>
  );
}
