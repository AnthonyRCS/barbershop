"use client";

import { BadgeDollarSign, Clock3, Phone, Scissors, UserRound } from "lucide-react";
import { Badge } from "@/components/ui";
import { AppointmentStatus } from "@/types";
import { formatCurrency } from "@/lib/currency";
import { useCurrency } from "@/contexts/CurrencyContext";

const statusConfig: Record<
  AppointmentStatus,
  { label: string; variant: "warning" | "info" | "success" | "error" | "default" }
> = {
  PENDING: { label: "Pendiente", variant: "warning" },
  CONFIRMED: { label: "Confirmada", variant: "info" },
  COMPLETED: { label: "Completada", variant: "success" },
  CANCELLED: { label: "Cancelada", variant: "error" },
  NO_SHOW: { label: "No asistio", variant: "error" },
};

const statusBorder: Record<AppointmentStatus, string> = {
  PENDING: "border-l-amber-500",
  CONFIRMED: "border-l-sky-500",
  COMPLETED: "border-l-emerald-500",
  CANCELLED: "border-l-zinc-500",
  NO_SHOW: "border-l-red-500",
};

export function AppointmentCard({
  customerName,
  barberName,
  serviceName,
  customerPhone,
  start,
  end,
  durationMinutes,
  price,
  status,
}: {
  customerName: string;
  barberName?: string;
  serviceName?: string;
  customerPhone?: string;
  start: string;
  end: string;
  durationMinutes?: number;
  price?: string | number;
  status: AppointmentStatus;
}) {
  const cfg = statusConfig[status];
  const { currency } = useCurrency();

  return (
    <div
      className={`min-w-0 rounded-xl border border-neutral-200 border-l-4 bg-white/95 px-3 py-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-950/95 ${statusBorder[status]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{customerName}</p>
        <Badge variant={cfg.variant}>{cfg.label}</Badge>
      </div>

      <div className="mt-2.5 grid gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
        <p className="flex items-center gap-1.5 font-mono text-neutral-700 dark:text-neutral-300">
          <Clock3 className="h-3.5 w-3.5" />
          {start} - {end}
          {durationMinutes ? ` (${durationMinutes} min)` : ""}
        </p>

        {serviceName ? (
          <p className="flex items-center gap-1.5 truncate">
            <Scissors className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-500" />
            {serviceName}
          </p>
        ) : null}

        {barberName ? (
          <p className="flex items-center gap-1.5 truncate">
            <UserRound className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-500" />
            {barberName}
          </p>
        ) : null}

        {customerPhone ? (
          <p className="flex items-center gap-1.5 truncate">
            <Phone className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-500" />
            {customerPhone}
          </p>
        ) : null}

        {price !== undefined ? (
          <p className="flex items-center gap-1.5 truncate font-medium text-neutral-700 dark:text-neutral-300">
            <BadgeDollarSign className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-500" />
            {formatCurrency(price, currency)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
