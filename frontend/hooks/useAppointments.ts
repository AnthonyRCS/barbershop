"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { APIError, api } from "@/lib/api";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { Appointment, AppointmentStatus, PaginatedResponse } from "@/types";

interface AppointmentFilters {
  date?: string;
  status?: AppointmentStatus | "ALL";
  barberId?: string | "ALL";
  page?: number;
  limit?: number;
}

export function useAppointments(filters?: AppointmentFilters) {
  const { data: session } = useSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildPath = useCallback((): string => {
    const params = new URLSearchParams();
    if (filters?.date) params.set("date", filters.date);
    if (filters?.status && filters.status !== "ALL") params.set("status", filters.status);
    if (filters?.barberId && filters.barberId !== "ALL") params.set("barberId", filters.barberId);
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.limit) params.set("limit", String(filters.limit));
    const query = params.toString();
    return query ? `/api/v1/appointments?${query}` : "/api/v1/appointments";
  }, [filters?.barberId, filters?.date, filters?.limit, filters?.page, filters?.status]);

  const load = useCallback(async () => {
    try {
      const response = await api.get<PaginatedResponse<Appointment>>(buildPath());
      setAppointments(response.data);
      setPagination({ total: response.total, page: response.page, limit: response.limit, pages: response.pages });
      setError(null);
    } catch (err) {
      const message = err instanceof APIError ? err.message : "No se pudieron cargar las citas";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [buildPath]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const token = session?.user?.token;
    if (!token) return;

    const socket = getSocket(token);

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    socket.on("appointment:created", () => void load());
    socket.on("appointment:updated", () => void load());
    socket.on("appointment:deleted", () => void load());

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("appointment:created");
      socket.off("appointment:updated");
      socket.off("appointment:deleted");
      disconnectSocket();
    };
  }, [load, session?.user?.token]);

  return { appointments, pagination, loading, connected, error, setAppointments, refetch: load };
}
