"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui";
import DataTable from "@/components/ui/DataTable";
import { formatCurrency } from "@/lib/currency";
import { useCurrency } from "@/contexts/CurrencyContext";

interface DashboardAppointment {
  id: string;
  startTime: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  finalPrice?: string;
}

const statusConfig = {
  PENDING:   { label: "Pendiente",  badge: "warning" as const },
  CONFIRMED: { label: "Confirmada", badge: "info" as const },
  COMPLETED: { label: "Completada", badge: "success" as const },
  CANCELLED: { label: "Cancelada",  badge: "error" as const },
  NO_SHOW:   { label: "No asistió", badge: "error" as const },
};

export function AppointmentsTable({ data }: { data: DashboardAppointment[] }) {
  const { currency } = useCurrency();

  const columns = useMemo(
    () => [
      {
        key: "id",
        label: "ID Reserva",
        render: (row: DashboardAppointment) => (
          <span className="font-medium text-foreground">#{row.id.slice(-6)}</span>
        ),
      },
      {
        key: "startTime",
        label: "Hora",
        render: (row: DashboardAppointment) => (
          <span className="text-sm font-medium text-foreground">
            {new Date(row.startTime).toLocaleTimeString("es", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        ),
      },
      {
        key: "status",
        label: "Estado",
        render: (row: DashboardAppointment) => {
          const cfg = statusConfig[row.status] ?? { label: row.status, badge: "default" as const };
          return <Badge variant={cfg.badge}>{cfg.label}</Badge>;
        },
      },
      {
        key: "finalPrice",
        label: "Precio",
        render: (row: DashboardAppointment) => (
          <span className="font-medium text-muted-foreground">
            {row.finalPrice ? formatCurrency(row.finalPrice, currency) : "—"}
          </span>
        ),
      },
    ],
    [currency],
  );

  return (
    <DataTable
      columns={columns}
      data={data}
      getKey={(row: DashboardAppointment) => row.id}
      emptyState={{
        title: "Sin citas agendadas",
        description: "No hay citas programadas para mostrar en este momento.",
      }}
      lsKey="dashboard_appointments_cols"
      total={data.length}
      pageSize={100}
    />
  );
}
