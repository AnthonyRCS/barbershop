import { auth } from "@/lib/auth";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle,
  Clock,
  DollarSign,
  Sparkles,
} from "lucide-react";
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
    | { data: DashboardAppointment[] }
    | DashboardAppointment[];

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
      <div className="premium-card relative overflow-hidden rounded-[1.75rem] px-6 py-6 sm:px-8">
        <div className="pointer-events-none absolute -right-12 -top-20 h-52 w-52 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full premium-hairline" />
        <div className="relative flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Panel premium de barberia
            </div>
            <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Resumen de actividad para tomar decisiones rapidas - {" "}
              {new Date().toLocaleDateString("es-PE", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <Link
            href="/appointments/new"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-primary/30"
          >
            Nueva cita
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="premium-card group flex items-center rounded-[1.35rem] p-5 text-card-foreground transition duration-300 hover:-translate-y-1"
          >
            <div className="min-w-0 flex-1">
              <p className="mb-1 truncate text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {label}
              </p>
              <p className="truncate text-3xl font-black tracking-tight text-foreground">
                {value}
              </p>
            </div>
            <div className="ml-4 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15 transition group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-6 w-6" strokeWidth={1.5} />
            </div>
          </div>
        ))}
      </div>

      <div className="premium-card flex flex-col overflow-hidden rounded-[1.5rem] text-card-foreground">
        <div className="flex items-center justify-between border-b border-border/70 bg-muted/30 px-6 py-5">
          <div>
            <h2 className="text-xl font-black tracking-tight text-foreground">Proximas Citas</h2>
            <p className="mt-1 text-xs font-medium text-muted-foreground">Las citas programadas para el dia de hoy</p>
          </div>
          <Link
            href="/appointments"
            className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3.5 py-2 text-xs font-bold text-primary transition hover:bg-primary hover:text-primary-foreground"
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
