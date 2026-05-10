"use client";

import { ClipboardList } from "lucide-react";

interface CustomerPortalSidebarProps {
  linkedBusinessCount: number;
  totalAppointments: number;
  pendingAppointments: number;
  confirmedAppointments: number;
}

interface StatCardProps {
  label: string;
  value: number;
  hint: string;
  valueClassName?: string;
}

function StatCard({ label, value, hint, valueClassName }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-3 backdrop-blur-sm">
      <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${valueClassName ?? "text-zinc-100"}`}>{value}</p>
      <p className="text-[11px] text-zinc-500">{hint}</p>
    </div>
  );
}

export function CustomerPortalSidebar({
  linkedBusinessCount,
  totalAppointments,
  pendingAppointments,
  confirmedAppointments,
}: CustomerPortalSidebarProps) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-5 lg:h-fit">
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-1">
        <StatCard label="Vinculadas" value={linkedBusinessCount} hint="Barberias" />
        <StatCard label="Proximas" value={totalAppointments} hint="Citas activas" />
        <StatCard
          label="Pendientes"
          value={pendingAppointments}
          hint="Por confirmar"
          valueClassName="text-amber-300"
        />
        <StatCard
          label="Confirmadas"
          value={confirmedAppointments}
          hint="Listas para asistir"
          valueClassName="text-cyan-200"
        />
      </div>

      <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="flex items-start gap-2.5">
          <ClipboardList className="mt-0.5 h-4 w-4 text-cyan-300" />
          <div>
            <p className="text-sm font-semibold text-cyan-100">Como agendar rapido</p>
            <p className="mt-1 text-xs text-zinc-300">
              1) Elige barberia, 2) selecciona servicio y barbero, 3) toca un horario libre y confirma tu cita.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

