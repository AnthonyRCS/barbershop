"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  TrendingUp,
  CreditCard,
  CalendarCheck,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Pause,
} from "lucide-react";
import { createPlatformApi } from "@/lib/platform-api";
import {
  DashboardMetrics,
  GrowthDataPoint,
  PlatformBusiness,
  PlatformAuditLog,
  PlatformSessionUser,
} from "@/types/platform";
import { StatusBadge, formatDate, formatCurrency } from "@/components/platform/PlatformShared";

interface RecentActivity {
  recentBusinesses: PlatformBusiness[];
  recentActivity: PlatformAuditLog[];
}

export function PlatformDashboard({
  token,
  user,
}: {
  token: string;
  user: PlatformSessionUser;
}) {
  const api = createPlatformApi(token);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [growth, setGrowth] = useState<GrowthDataPoint[]>([]);
  const [activity, setActivity] = useState<RecentActivity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [m, g, a] = await Promise.all([
        api.get<DashboardMetrics>("/dashboard/metrics"),
        api.get<GrowthDataPoint[]>("/dashboard/growth"),
        api.get<RecentActivity>("/dashboard/recent-activity"),
      ]);
      setMetrics(m);
      setGrowth(g);
      setActivity(a);
      setLoading(false);
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const firstName = user.name.split(" ")[0];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Bienvenido, {firstName}
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Visión global de la plataforma SaaS — {new Date().toLocaleDateString("es-PE", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-zinc-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : metrics ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Total Barberías"
              value={metrics.totalBusinesses}
              icon={Building2}
              color="violet"
            />
            <KPICard
              label="Activas"
              value={metrics.activeBusinesses}
              icon={CheckCircle2}
              color="emerald"
            />
            <KPICard
              label="En Trial"
              value={metrics.trialBusinesses}
              icon={Clock}
              color="amber"
            />
            <KPICard
              label="Suspendidas"
              value={metrics.suspendedBusinesses}
              icon={Pause}
              color="orange"
            />
            <KPICard
              label="Canceladas"
              value={metrics.cancelledBusinesses}
              icon={XCircle}
              color="red"
            />
            <KPICard
              label="Suscripciones Activas"
              value={metrics.activeSubscriptions}
              icon={CreditCard}
              color="blue"
            />
            <KPICard
              label="Total Citas"
              value={metrics.totalAppointments.toLocaleString()}
              icon={CalendarCheck}
              color="teal"
            />
            <KPICard
              label="MRR Estimado"
              value={formatCurrency(Number(metrics.estimatedMRR))}
              icon={DollarSign}
              color="green"
            />
          </div>

          {/* Growth Chart (simplified bar chart) + Plan Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Growth */}
            <div className="lg:col-span-2 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-zinc-300 mb-4">Crecimiento mensual</h2>
              <div className="flex items-end gap-2 h-36">
                {growth.map((point) => {
                  const maxVal = Math.max(...growth.map((p) => p.businesses), 1);
                  const heightPct = Math.max((point.businesses / maxVal) * 100, 4);
                  return (
                    <div key={point.month} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-primary/70 rounded-t-md transition-all hover:bg-primary/80"
                        style={{ height: `${heightPct}%` }}
                        title={`${point.businesses} negocios`}
                      />
                      <span className="text-[9px] text-zinc-600 truncate w-full text-center">
                        {point.month.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-zinc-600 mt-2">Negocios creados por mes (últimos 6 meses)</p>
            </div>

            {/* Plan Distribution */}
            <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-zinc-300 mb-4">Distribución de Planes</h2>
              <div className="space-y-3">
                {metrics.planDistribution.map((plan) => (
                  <div key={plan.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-zinc-300">{plan.name}</p>
                      <p className="text-[10px] text-zinc-600">{formatCurrency(Number(plan.price))}/mes</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{plan._count.businesses}</p>
                      <p className="text-[10px] text-zinc-600">negocios</p>
                    </div>
                  </div>
                ))}
                {metrics.planDistribution.length === 0 && (
                  <p className="text-xs text-zinc-600">Sin planes configurados</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Businesses */}
          {activity && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-300">Negocios recientes</h2>
                  <Link href="/platform/businesses" className="text-xs text-primary hover:text-primary/80 transition-colors">
                    Ver todos →
                  </Link>
                </div>
                <div className="space-y-3">
                  {activity.recentBusinesses.slice(0, 6).map((biz) => (
                    <Link
                      key={biz.id}
                      href={`/platform/businesses/${biz.id}`}
                      className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0 hover:opacity-80 transition-opacity"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{biz.name}</p>
                        <p className="text-[10px] text-zinc-600">{biz.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={biz.status} />
                      </div>
                    </Link>
                  ))}
                  {activity.recentBusinesses.length === 0 && (
                    <p className="text-sm text-zinc-600">Sin registros recientes</p>
                  )}
                </div>
              </div>

              {/* Recent Audit Activity */}
              <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-300">Actividad reciente</h2>
                  <Link href="/platform/audit-logs" className="text-xs text-primary hover:text-primary/80 transition-colors">
                    Ver auditoría →
                  </Link>
                </div>
                <div className="space-y-2.5">
                  {activity.recentActivity.slice(0, 7).map((log) => (
                    <div key={log.id} className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-300">
                          <span className="font-medium text-zinc-200">{log.performedBy.name}</span>
                          {" — "}
                          <span className="text-primary">{log.action}</span>
                          {" "}
                          <span className="text-zinc-500">{log.entity}</span>
                        </p>
                        <p className="text-[10px] text-zinc-600">{formatDate(log.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                  {activity.recentActivity.length === 0 && (
                    <p className="text-sm text-zinc-600">Sin actividad reciente</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-zinc-600 text-sm">Error al cargar métricas</div>
      )}
    </div>
  );
}

const colorMap = {
  violet: "from-violet-600/20 to-violet-600/5 border-primary/20 text-primary",
  emerald: "from-emerald-600/20 to-emerald-600/5 border-emerald-500/20 text-emerald-400",
  amber: "from-amber-600/20 to-amber-600/5 border-amber-500/20 text-amber-400",
  orange: "from-orange-600/20 to-orange-600/5 border-orange-500/20 text-orange-400",
  red: "from-red-600/20 to-red-600/5 border-red-500/20 text-red-400",
  blue: "from-blue-600/20 to-blue-600/5 border-blue-500/20 text-blue-400",
  teal: "from-teal-600/20 to-teal-600/5 border-teal-500/20 text-teal-400",
  green: "from-green-600/20 to-green-600/5 border-green-500/20 text-green-400",
} as const;

function KPICard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: keyof typeof colorMap;
}) {
  return (
    <div
      className={`bg-gradient-to-br ${colorMap[color]} border rounded-2xl p-5 flex flex-col gap-3`}
    >
      <Icon className={`h-5 w-5 ${colorMap[color].split(" ").pop()}`} />
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}


