"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { createPlatformApi } from "@/lib/platform-api";
import { PlatformAuditLog, PaginatedResponse } from "@/types/platform";
import {
  PlatformPageHeader,
  PlatformCard,
  EmptyState,
  formatDate,
} from "@/components/platform/PlatformShared";
import { cn } from "@/lib/utils";

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "text-blue-400 bg-blue-500/10",
  BUSINESS_SUSPEND: "text-orange-400 bg-orange-500/10",
  BUSINESS_REACTIVATE: "text-emerald-400 bg-emerald-500/10",
  BUSINESS_CANCEL: "text-red-400 bg-red-500/10",
  BUSINESS_UPDATE: "text-zinc-400 bg-zinc-800",
  PLAN_CHANGE: "text-primary bg-primary/10",
  PLAN_CREATE: "text-primary bg-primary/10",
  PLAN_UPDATE: "text-zinc-400 bg-zinc-800",
  PLAN_TOGGLE: "text-amber-400 bg-amber-500/10",
  SUBSCRIPTION_RENEW: "text-emerald-400 bg-emerald-500/10",
  SUBSCRIPTION_CANCEL: "text-red-400 bg-red-500/10",
  SUBSCRIPTION_STATUS_CHANGE: "text-amber-400 bg-amber-500/10",
  PLATFORM_USER_CREATE: "text-primary bg-primary/10",
  PLATFORM_USER_UPDATE: "text-zinc-400 bg-zinc-800",
  PLATFORM_USER_STATUS_CHANGE: "text-amber-400 bg-amber-500/10",
};

export function AuditLogsView({ token }: { token: string }) {
  const api = createPlatformApi(token);
  const [data, setData] = useState<PaginatedResponse<PlatformAuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (action) params.set("action", action);
    if (entity) params.set("entity", entity);
    if (from) params.set("from", new Date(from).toISOString());
    if (to) params.set("to", new Date(to + "T23:59:59").toISOString());

    const result = await api.get<PaginatedResponse<PlatformAuditLog>>(
      `/audit-logs?${params.toString()}`,
    );
    setData(result);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, action, entity, from, to]);

  useEffect(() => {
    const t = setTimeout(() => { void load(); }, action || entity ? 400 : 0);
    return () => clearTimeout(t);
  }, [load, action, entity]);

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PlatformPageHeader
        title="Auditoría"
        description={data ? `${data.total} registros de auditoría` : "Trazabilidad de acciones administrativas"}
      />

      {/* Filters */}
      <PlatformCard className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              placeholder="Filtrar por acción..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <input
            value={entity}
            onChange={(e) => { setEntity(e.target.value); setPage(1); }}
            placeholder="Entidad (Business, Plan...)"
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
            className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </PlatformCard>

      {/* Logs */}
      <PlatformCard>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 bg-zinc-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <EmptyState message="Sin registros de auditoría con los filtros aplicados." />
        ) : (
          <>
            <div className="divide-y divide-zinc-800/50">
              {data.items.map((log) => (
                <div key={log.id}>
                  <button
                    onClick={() => setExpanded((e) => (e === log.id ? null : log.id))}
                    className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-zinc-800/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={cn(
                          "text-[11px] font-bold px-2 py-0.5 rounded-md flex-shrink-0",
                          ACTION_COLORS[log.action] ?? "text-zinc-400 bg-zinc-800",
                        )}
                      >
                        {log.action}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-300 truncate">
                          <span className="font-medium text-zinc-200">{log.performedBy.name}</span>
                          {" · "}
                          <span className="text-zinc-500">{log.entity} #{log.entityId.slice(-8)}</span>
                        </p>
                        <p className="text-xs text-zinc-600">{formatDate(log.createdAt)}</p>
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-zinc-600 flex-shrink-0 transition-transform",
                        expanded === log.id && "rotate-180",
                      )}
                    />
                  </button>

                  {expanded === log.id && (
                    <div className="px-4 pb-4 space-y-3 bg-zinc-900/40">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-zinc-600 mb-1">Actor</p>
                          <p className="text-zinc-300">{log.performedBy.name} ({log.performedBy.role})</p>
                          <p className="text-zinc-600">{log.performedBy.email}</p>
                        </div>
                        {log.ipAddress && (
                          <div>
                            <p className="text-zinc-600 mb-1">IP</p>
                            <p className="text-zinc-400 font-mono">{log.ipAddress}</p>
                          </div>
                        )}
                      </div>
                      {(log.before ?? log.after) && (
                        <div className="grid grid-cols-2 gap-3">
                          {log.before && (
                            <div>
                              <p className="text-xs text-zinc-600 mb-1">Antes</p>
                              <pre className="text-[11px] text-zinc-400 bg-zinc-900 rounded-lg p-3 overflow-auto max-h-32">
                                {JSON.stringify(log.before, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.after && (
                            <div>
                              <p className="text-xs text-zinc-600 mb-1">Después</p>
                              <pre className="text-[11px] text-zinc-400 bg-zinc-900 rounded-lg p-3 overflow-auto max-h-32">
                                {JSON.stringify(log.after, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                      {log.metadata && (
                        <div>
                          <p className="text-xs text-zinc-600 mb-1">Metadata</p>
                          <pre className="text-[11px] text-zinc-400 bg-zinc-900 rounded-lg p-3 overflow-auto max-h-24">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
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
    </div>
  );
}

