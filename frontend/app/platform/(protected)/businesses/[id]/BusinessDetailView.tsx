"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Users,
  Scissors,
  CalendarCheck,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Pause,
  RefreshCw,
} from "lucide-react";
import { createPlatformApi } from "@/lib/platform-api";
import { PlatformBusinessDetail, PlatformPlan, BusinessStatus } from "@/types/platform";
import {
  StatusBadge,
  SubscriptionStatusBadge,
  PlatformCard,
  formatDate,
  formatDateOnly,
  formatCurrency,
  ConfirmModal,
} from "@/components/platform/PlatformShared";

const STATUS_ACTIONS: Array<{
  status: BusinessStatus;
  label: string;
  icon: React.ElementType;
  className: string;
}> = [
  { status: "ACTIVE", label: "Activar", icon: CheckCircle, className: "text-emerald-400 hover:bg-emerald-500/10" },
  { status: "SUSPENDED", label: "Suspender", icon: Pause, className: "text-orange-400 hover:bg-orange-500/10" },
  { status: "CANCELLED", label: "Cancelar", icon: XCircle, className: "text-red-400 hover:bg-red-500/10" },
  { status: "TRIAL", label: "Marcar Trial", icon: Clock, className: "text-amber-400 hover:bg-amber-500/10" },
];

export function BusinessDetailView({
  token,
  businessId,
}: {
  token: string;
  businessId: string;
}) {
  const api = createPlatformApi(token);
  const [biz, setBiz] = useState<PlatformBusinessDetail | null>(null);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("");

  useEffect(() => {
    async function load() {
      const [b, p] = await Promise.all([
        api.get<PlatformBusinessDetail>(`/businesses/${businessId}`),
        api.get<PlatformPlan[]>("/plans"),
      ]);
      setBiz(b);
      setPlans(p);
      setSelectedPlan(b.plan?.id ?? "");
      setLoading(false);
    }
    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  async function handleStatusChange(status: BusinessStatus) {
    const labels: Record<BusinessStatus, string> = {
      ACTIVE: "reactivar",
      SUSPENDED: "suspender",
      CANCELLED: "cancelar",
      TRIAL: "marcar como trial",
    };
    setConfirmModal({
      open: true,
      title: `¿${labels[status].charAt(0).toUpperCase() + labels[status].slice(1)} este negocio?`,
      message: `Esta acción cambiará el estado a "${status}". Quedará registrado en auditoría.`,
      action: async () => {
        await api.patch(`/businesses/${businessId}/status`, { status });
        const updated = await api.get<PlatformBusinessDetail>(`/businesses/${businessId}`);
        setBiz(updated);
      },
    });
  }

  async function handlePlanChange() {
    if (!selectedPlan || selectedPlan === biz?.plan.id) return;
    setChangingPlan(true);
    try {
      await api.patch(`/businesses/${businessId}/plan`, { planId: selectedPlan });
      const updated = await api.get<PlatformBusinessDetail>(`/businesses/${businessId}`);
      setBiz(updated);
    } finally {
      setChangingPlan(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="h-8 w-32 bg-zinc-800 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-zinc-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!biz) {
    return (
      <div className="p-8 text-center text-zinc-600">Negocio no encontrado</div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/platform/businesses"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a Barberías
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              {biz.name}
              <StatusBadge status={biz.status} />
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">{biz.email} · /{biz.slug}</p>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Usuarios", value: biz._count.users, icon: Users },
          { label: "Barberos", value: biz._count.barbers, icon: Scissors },
          { label: "Servicios", value: biz._count.services, icon: Building2 },
          { label: "Clientes", value: biz._count.customers, icon: Users },
          { label: "Citas totales", value: biz._count.appointments, icon: CalendarCheck },
        ].map((stat) => (
          <PlatformCard key={stat.label} className="p-4">
            <stat.icon className="h-4 w-4 text-zinc-600 mb-2" />
            <p className="text-xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-zinc-600">{stat.label}</p>
          </PlatformCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info */}
        <div className="lg:col-span-2 space-y-4">
          <PlatformCard className="p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Información general</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              {[
                ["Email", biz.email],
                ["Teléfono", biz.phone || "—"],
                ["Dirección", biz.address || "—"],
                ["Slug", `/${biz.slug}`],
                ["Plan actual", biz.plan.name],
                ["Creado", formatDateOnly(biz.createdAt)],
                ["Trial hasta", biz.trialEndsAt ? formatDateOnly(biz.trialEndsAt) : "—"],
                ["Citas este mes", biz.stats.appointmentsThisMonth],
                ["Última actividad", biz.stats.lastActivity ? formatDate(biz.stats.lastActivity) : "—"],
              ].map(([k, v]) => (
                <div key={String(k)}>
                  <dt className="text-xs text-zinc-600">{k}</dt>
                  <dd className="text-sm text-zinc-200 font-medium truncate">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </PlatformCard>

          {/* Subscriptions */}
          <PlatformCard className="p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Historial de suscripciones</h2>
            {biz.subscriptions.length === 0 ? (
              <p className="text-sm text-zinc-600">Sin suscripciones registradas</p>
            ) : (
              <div className="space-y-3">
                {biz.subscriptions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                    <div>
                      <p className="text-sm text-zinc-200">{sub.plan.name}</p>
                      <p className="text-xs text-zinc-600">
                        {formatDateOnly(sub.startDate)} — {formatDateOnly(sub.endDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {sub.amount && (
                        <span className="text-xs text-zinc-400">{formatCurrency(Number(sub.amount))}</span>
                      )}
                      <SubscriptionStatusBadge status={sub.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PlatformCard>
        </div>

        {/* Admin Actions */}
        <div className="space-y-4">
          {/* Change Plan */}
          <PlatformCard className="p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-zinc-600" />
              Cambiar Plan
            </h2>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.name} — {formatCurrency(Number(p.price))}</option>
              ))}
            </select>
            <button
              onClick={handlePlanChange}
              disabled={changingPlan || selectedPlan === biz.plan.id}
              className="w-full py-2 text-sm font-medium bg-primary hover:bg-primary/90 disabled:opacity-40 text-white rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              {changingPlan && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Aplicar plan
            </button>
          </PlatformCard>

          {/* Status Actions */}
          <PlatformCard className="p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-3">Cambiar Estado</h2>
            <div className="space-y-2">
              {STATUS_ACTIONS.filter((a) => a.status !== biz.status).map((action) => (
                <button
                  key={action.status}
                  onClick={() => void handleStatusChange(action.status)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors ${action.className}`}
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </button>
              ))}
            </div>
          </PlatformCard>
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmModal && (
        <ConfirmModal
          open={confirmModal.open}
          title={confirmModal.title}
          message={confirmModal.message}
          loading={actionLoading}
          variant="warning"
          onCancel={() => setConfirmModal(null)}
          onConfirm={async () => {
            setActionLoading(true);
            try {
              await confirmModal.action();
            } finally {
              setActionLoading(false);
              setConfirmModal(null);
            }
          }}
        />
      )}
    </div>
  );
}

