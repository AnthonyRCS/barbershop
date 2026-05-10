"use client";

import { useEffect, useState, useCallback } from "react";
import { Filter, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { createPlatformApi } from "@/lib/platform-api";
import {
  PlatformSubscription,
  PaginatedResponse,
  SubscriptionStatus,
  PlatformPlan,
} from "@/types/platform";
import {
  SubscriptionStatusBadge,
  PlatformPageHeader,
  PlatformCard,
  EmptyState,
  formatDateOnly,
  formatCurrency,
  ConfirmModal,
} from "@/components/platform/PlatformShared";
import { cn } from "@/lib/utils";

const STATUSES: { value: SubscriptionStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "ACTIVE", label: "Activas" },
  { value: "PAST_DUE", label: "Vencidas" },
  { value: "CANCELLED", label: "Canceladas" },
];

const STATUS_ACTIONS: Array<{ status: SubscriptionStatus; label: string; className: string }> = [
  { status: "ACTIVE", label: "Renovar", className: "text-emerald-400 hover:bg-emerald-500/10" },
  { status: "PAST_DUE", label: "Marcar vencida", className: "text-red-400 hover:bg-red-500/10" },
  { status: "CANCELLED", label: "Cancelar", className: "text-zinc-400 hover:bg-zinc-700" },
];

export function SubscriptionsView({ token }: { token: string }) {
  const api = createPlatformApi(token);
  const [data, setData] = useState<PaginatedResponse<PlatformSubscription> | null>(null);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<SubscriptionStatus | "">("");
  const [planId, setPlanId] = useState("");
  const [page, setPage] = useState(1);
  const [expiringOnly, setExpiringOnly] = useState(false);
  const [actionModal, setActionModal] = useState<{
    subId: string;
    newStatus: SubscriptionStatus;
    label: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) params.set("status", status);
    if (planId) params.set("planId", planId);
    if (expiringOnly) params.set("expiringDays", "7");

    const result = await api.get<PaginatedResponse<PlatformSubscription>>(
      `/subscriptions?${params.toString()}`,
    );
    setData(result);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, planId, expiringOnly]);

  useEffect(() => {
    void api.get<PlatformPlan[]>("/plans").then(setPlans);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleStatusChange() {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      await api.patch(`/subscriptions/${actionModal.subId}/status`, { status: actionModal.newStatus });
      await load();
    } finally {
      setActionLoading(false);
      setActionModal(null);
    }
  }

  function isExpiringSoon(endDate: string) {
    const days = (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days <= 7 && days > 0;
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PlatformPageHeader
        title="Suscripciones"
        description={data ? `${data.total} suscripciones registradas` : "Gestión de suscripciones"}
      />

      {/* Filters */}
      <PlatformCard className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-zinc-600 flex-shrink-0" />
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as SubscriptionStatus | ""); setPage(1); }}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <select
            value={planId}
            onChange={(e) => { setPlanId(e.target.value); setPage(1); }}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos los planes</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={expiringOnly}
              onChange={(e) => { setExpiringOnly(e.target.checked); setPage(1); }}
              className="accent-violet-500"
            />
            <span className="text-sm text-zinc-400 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Expiran en 7 días
            </span>
          </label>
        </div>
      </PlatformCard>

      {/* Table */}
      <PlatformCard>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState message="No se encontraron suscripciones." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    {["Negocio", "Plan", "Estado", "Inicio", "Vencimiento", "Monto", "Acciones"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider first:rounded-tl-2xl last:rounded-tr-2xl">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((sub) => (
                    <tr
                      key={sub.id}
                      className={cn(
                        "border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors",
                        isExpiringSoon(sub.endDate) && "bg-amber-500/5",
                      )}
                    >
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{sub.business.name}</p>
                          <p className="text-xs text-zinc-600">/{sub.business.slug}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-lg">{sub.plan.name}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <SubscriptionStatusBadge status={sub.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-zinc-500">{formatDateOnly(sub.startDate)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-zinc-400">{formatDateOnly(sub.endDate)}</span>
                          {isExpiringSoon(sub.endDate) && sub.status === "ACTIVE" && (
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-zinc-400">
                          {sub.amount ? formatCurrency(Number(sub.amount)) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex gap-1">
                          {STATUS_ACTIONS.filter((a) => a.status !== sub.status).slice(0, 2).map((action) => (
                            <button
                              key={action.status}
                              onClick={() => setActionModal({ subId: sub.id, newStatus: action.status, label: action.label })}
                              className={cn("text-xs px-2.5 py-1 rounded-lg transition-colors", action.className)}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-600">
                  {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} de {data.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 disabled:text-zinc-700 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-zinc-400">{page}/{data.totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 disabled:text-zinc-700 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </PlatformCard>

      <ConfirmModal
        open={!!actionModal}
        title={`¿${actionModal?.label} esta suscripción?`}
        message="Esta acción quedará registrada en el log de auditoría."
        loading={actionLoading}
        variant="warning"
        onCancel={() => setActionModal(null)}
        onConfirm={handleStatusChange}
      />
    </div>
  );
}

