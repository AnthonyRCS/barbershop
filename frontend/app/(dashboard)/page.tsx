import { auth } from "@/lib/auth";
import Link from "next/link";
import { CalendarDays, CheckCircle, Clock, DollarSign, ArrowUpRight } from "lucide-react";
import { AppointmentsTable } from "@/components/dashboard/AppointmentsTable";

interface DashboardAppointment {
  id: string;
  startTime: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  finalPrice?: string;
}

export default async function DashboardPage() {
  const session = await auth();
  const token = session?.user?.token;
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3001";

  const today = new Date().toISOString().split("T")[0];
  const response = await fetch(
    `${backendUrl}/api/v1/appointments?date=${today}&limit=100`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    },
  );

  type AppointmentsResponse =
    | { data: DashboardAppointment[] }   // paginated (current API)
    | DashboardAppointment[];            // legacy flat array

  const raw = response.ok ? (await response.json()) as AppointmentsResponse : [];
  const appointments: DashboardAppointment[] = Array.isArray(raw) ? raw : (raw.data ?? []);

  const scheduled = appointments.length;
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const pending = appointments.filter((a) => a.status === "PENDING").length;
  const income = appointments
    .filter((a) => a.status === "COMPLETED")
    .reduce((sum, a) => sum + Number(a.finalPrice ?? 0), 0);

  const upcoming = [...appointments]
    .filter((a) => a.status !== "CANCELLED")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 15);

  const metrics = [
    { label: "Citas Hoy", value: scheduled, icon: CalendarDays },
    { label: "Completadas", value: completed, icon: CheckCircle },
    { label: "Pendientes", value: pending, icon: Clock },
    { label: "Ingresos (S/)", value: `S/. ${income.toFixed(2)}`, icon: DollarSign },
  ] as const;

  return (
    <div className="w-full space-y-8 px-4 py-6 sm:px-6 lg:px-8 xl:px-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumen de actividad —{" "}
            {new Date().toLocaleDateString("es-PE", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex items-center rounded-xl border border-border bg-card p-5 text-card-foreground shadow-sm"
          >
             <div className="flex-1 min-w-0">
               <p className="mb-1 truncate text-sm font-medium text-muted-foreground">
                 {label}
               </p>
               <p className="truncate text-2xl font-bold text-foreground">
                 {value}
               </p>
             </div>
             <div className="ml-4 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
               <Icon className="h-6 w-6" strokeWidth={1.5} />
             </div>
          </div>
        ))}
      </div>

      {/* Upcoming appointments Table */}
      <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground tracking-tight">Próximas Citas</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Las citas programadas para el día de hoy</p>
          </div>
          <Link
            href="/appointments"
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
          >
            Ver Calendario
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="h-[400px]">
          <AppointmentsTable data={upcoming} />
        </div>
      </div>
    </div>
  );
}
