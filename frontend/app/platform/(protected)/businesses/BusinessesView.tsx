"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Search, Filter, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { createPlatformApi } from "@/lib/platform-api";
import {
  PlatformBusiness,
  PaginatedResponse,
  BusinessStatus,
  PlatformPlan,
} from "@/types/platform";
import {
  StatusBadge,
  PlatformPageHeader,
  PlatformCard,
  EmptyState,
  formatDateOnly,
} from "@/components/platform/PlatformShared";
import { cn } from "@/lib/utils";

const STATUSES: { value: BusinessStatus | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "ACTIVE", label: "Activas" },
  { value: "TRIAL", label: "Trial" },
  { value: "SUSPENDED", label: "Suspendidas" },
  { value: "CANCELLED", label: "Canceladas" },
];

export function BusinessesView({ token }: { token: string }) {
  const api = createPlatformApi(token);

  const [data, setData] = useState<PaginatedResponse<PlatformBusiness> | null>(null);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BusinessStatus | "">("");
  const [planId, setPlanId] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (planId) params.set("planId", planId);

    const result = await api.get<PaginatedResponse<PlatformBusiness>>(
      `/businesses?${params.toString()}`,
    );
    setData(result);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, status, planId]);

  useEffect(() => {
    void api.get<PlatformPlan[]>("/plans").then(setPlans);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PlatformPageHeader
        title="Barberías"
        description={data ? `${data.total} negocios registrados en la plataforma` : "Gestión de tenants"}
      />

      {/* Filters */}
      <PlatformCard className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar por nombre, slug o email..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-600" />
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value as BusinessStatus | ""); setPage(1); }}
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
          </div>
        </div>
      </PlatformCard>

      {/* Table */}
      <PlatformCard>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState message="No se encontraron barberías con los filtros aplicados." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Negocio</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Plan</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Usuarios</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Citas</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider hidden xl:table-cell">Creado</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((biz) => (
                    <tr key={biz.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{biz.name}</p>
                          <p className="text-xs text-zinc-600">{biz.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded-lg">{biz.plan.name}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={biz.status} />
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-sm text-zinc-400">{biz._count.users}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-sm text-zinc-400">{biz._count.appointments}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden xl:table-cell">
                        <span className="text-xs text-zinc-600">{formatDateOnly(biz.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/platform/businesses/${biz.id}`}
                          className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-all"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
                <p className="text-xs text-zinc-600">
                  Mostrando {(page - 1) * 20 + 1}–{Math.min(page * 20, data.total)} de {data.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      page === 1 ? "text-zinc-700 cursor-not-allowed" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-zinc-400 min-w-[60px] text-center">
                    {page} / {data.totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                    disabled={page === data.totalPages}
                    className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      page === data.totalPages ? "text-zinc-700 cursor-not-allowed" : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
                    )}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </PlatformCard>
    </div>
  );
}


