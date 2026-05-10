"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Clock, Scissors, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { PageLoader, Badge } from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";
import type { Appointment, PaginatedResponse } from "@/types";

const TOKEN_KEY = "customer_portal_token";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "error",
  NO_SHOW: "default",
};

function formatDate(iso: string) {
  try {
    return format(new Date(iso), "d 'de' MMMM yyyy", { locale: es });
  } catch {
    return iso;
  }
}

function formatTime(iso: string) {
  try {
    return format(new Date(iso), "HH:mm");
  } catch {
    return iso;
  }
}

export default function CustomerHistoryPage() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHistory = useCallback(async (page: number) => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace("/customer/login" as never);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/proxy/api/v1/customer-portal/my-history?page=${page}&limit=15`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        router.replace("/customer/login" as never);
        return;
      }

      const data = (await res.json()) as PaginatedResponse<Appointment>;
      setAppointments(data.data ?? []);
      setPagination({ total: data.total, page: data.page, limit: data.limit, pages: data.pages });
    } catch {
      setError("No se pudo cargar el historial.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchHistory(1);
  }, [fetchHistory]);

  if (loading && appointments.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <PageLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <a
            href="/customer/appointments"
            className="text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-300"
          >
            ← Volver
          </a>
          <h1 className="text-lg font-bold text-zinc-100">Historial de citas</h1>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {appointments.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-16 text-center">
            <CalendarDays className="mb-3 h-10 w-10 text-zinc-700" />
            <p className="text-sm font-medium text-zinc-400">Sin historial de citas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => (
              <div
                key={appt.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-zinc-800">
                      <Scissors className="h-4 w-4 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200 capitalize">
                        {formatDate(appt.startTime)}
                      </p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTime(appt.startTime)}
                        </span>
                        {appt.barber?.user?.name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {appt.barber.user.name}
                          </span>
                        )}
                      </div>
                      {appt.service?.name && (
                        <p className="mt-1 text-xs text-zinc-500">{appt.service.name}</p>
                      )}
                    </div>
                  </div>
                  <Badge variant={STATUS_VARIANTS[appt.status] ?? "default"}>
                    {STATUS_LABELS[appt.status] ?? appt.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination
          page={pagination.page}
          pages={pagination.pages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={(p) => void fetchHistory(p)}
          className="mt-6"
        />
      </div>
    </div>
  );
}
