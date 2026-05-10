"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { api, APIError } from "@/lib/api";
import {
  Search,
  Calendar,
  Clock,
  AlertCircle,
  Scissors,
  CheckCircle,
  User,
  Loader2,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { Barber, Service, Customer } from "@/types";
import { generateUuid } from "@/lib/uuid";
import { formatCurrency } from "@/lib/currency";
import { useCurrency } from "@/contexts/CurrencyContext";

// ─── Form schema ──────────────────────────────────────────────────────────────

const FormSchema = z.object({
  customerId: z.string().min(1, "Selecciona un cliente"),
  barberId: z.string().min(1, "Selecciona un barbero"),
  serviceId: z.string().min(1, "Selecciona un servicio"),
  appointmentDate: z.string().min(1, "Fecha requerida"),
  startTime: z.string().min(1, "Hora requerida"),
  notes: z.string().max(500).optional(),
});

type FormData = z.infer<typeof FormSchema>;

// ─── Error code → message map ────────────────────────────────────────────────

const ERROR_MESSAGES: Record<string, string> = {
  BARBER_SCHEDULE_CONFLICT: "El barbero ya tiene una cita en ese horario. Elige otro horario.",
  PLAN_LIMIT_EXCEEDED: "Has alcanzado el límite de citas de tu plan mensual.",
  CUSTOMER_NOT_FOUND: "El cliente seleccionado no existe.",
  BARBER_NOT_FOUND: "El barbero seleccionado no está disponible.",
  SERVICE_NOT_FOUND: "El servicio seleccionado no está disponible.",
  SUBSCRIPTION_NOT_FOUND: "No tienes una suscripción activa. Contacta soporte.",
};

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  onSuccess: () => void;
  defaultDate?: string; // yyyy-MM-dd
}

interface DayAppointment {
  id: string;
  barberId: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
}

export function AppointmentForm({ onSuccess, defaultDate }: Props) {
  const { currency } = useCurrency();
  const [serverError, setServerError] = useState("");
  const [serverErrorRequestId, setServerErrorRequestId] = useState<string | undefined>();
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  // Stable idempotency key for this form instance — prevents double-submit
  const idempotencyKeyRef = useRef<string>(generateUuid());

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [dayAppointments, setDayAppointments] = useState<DayAppointment[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      customerId: "",
      barberId: "",
      serviceId: "",
      appointmentDate: defaultDate ?? new Date().toISOString().split("T")[0],
      startTime: "",
      notes: "",
    },
  });

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  // ── Load barbers and services on mount ──────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [barbersData, servicesData] = await Promise.all([
          api.get<Barber[]>("/api/v1/barbers"),
          api.get<Service[]>("/api/v1/services"),
        ]);
        setBarbers(barbersData.filter((b) => b.active));
        setServices(servicesData.filter((s) => s.active));
      } catch {
        // silently continue — lists will be empty and user will see the warning
      } finally {
        setLoadingData(false);
      }
    };
    void load();
  }, []);

  // ── Customer search with debounce ────────────────────────────────────────────
  const searchCustomers = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const result = await api.get<{ data: Customer[] }>(
        `/api/v1/customers?search=${encodeURIComponent(query)}&limit=6`,
      );
      setCustomerResults(result.data ?? []);
    } catch {
      setCustomerResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleCustomerInput = (value: string) => {
    setCustomerSearch(value);
    setShowDropdown(true);
    if (!value.trim()) {
      setSelectedCustomer(null);
      setValue("customerId", "", { shouldValidate: false });
      setCustomerResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void searchCustomers(value), 300);
  };

  const selectCustomer = (c: Customer) => {
    setSelectedCustomer(c);
    setCustomerSearch(c.name + (c.phone ? ` · ${c.phone}` : ""));
    setValue("customerId", c.id, { shouldValidate: true });
    setShowDropdown(false);
    setCustomerResults([]);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Form submit ──────────────────────────────────────────────────────────────
  async function onSubmit(values: FormData): Promise<void> {
    setServerError("");
    setServerErrorRequestId(undefined);
    try {
      // Combine date + time into ISO datetime (local → UTC via Date constructor)
      const localStart = new Date(`${values.appointmentDate}T${values.startTime}:00`);
      const localDate = new Date(`${values.appointmentDate}T00:00:00`);

      if (isNaN(localStart.getTime())) {
        setServerError("Fecha u hora inválida.");
        return;
      }

      await api.post(
        "/api/v1/appointments",
        {
          customerId: values.customerId,
          barberId: values.barberId,
          serviceId: values.serviceId,
          appointmentDate: localDate.toISOString(),
          startTime: localStart.toISOString(),
          notes: values.notes ?? undefined,
          idempotencyKey: idempotencyKeyRef.current,
        },
        { idempotencyKey: idempotencyKeyRef.current },
      );

      onSuccess();
    } catch (err) {
      if (err instanceof APIError) {
        setServerError(
          ERROR_MESSAGES[err.code] ?? err.message ?? "Error al confirmar la cita.",
        );
        setServerErrorRequestId(err.requestId);
      } else {
        setServerError("Error de conexión. Verifica que el backend esté activo.");
      }
    }
  }

  const selectedServiceId = watch("serviceId");
  const selectedBarberId = watch("barberId");
  const selectedDate = watch("appointmentDate");
  const selectedStartTime = watch("startTime");
  const selectedService = services.find((s) => s.id === selectedServiceId);

  useEffect(() => {
    const loadDayAppointments = async () => {
      if (!selectedBarberId || !selectedDate) {
        setDayAppointments([]);
        return;
      }
      setLoadingSuggestions(true);
      try {
        const response = await api.get<{ data: DayAppointment[] }>(
          `/api/v1/appointments?date=${encodeURIComponent(selectedDate)}&barberId=${encodeURIComponent(selectedBarberId)}&limit=100`,
        );
        setDayAppointments(response.data ?? []);
      } catch {
        setDayAppointments([]);
      } finally {
        setLoadingSuggestions(false);
      }
    };
    void loadDayAppointments();
  }, [selectedBarberId, selectedDate]);

  const suggestedTime = useMemo(() => {
    if (!selectedDate || !selectedBarberId) return "";
    const duration = selectedService?.durationMinutes ?? 30;
    const activeAppointments = dayAppointments
      .filter((item) => item.status !== "CANCELLED")
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const openAt = new Date(`${selectedDate}T09:00:00`);
    const closeAt = new Date(`${selectedDate}T21:00:00`);
    let candidate = openAt;

    for (const appt of activeAppointments) {
      const apptStart = new Date(appt.startTime);
      const apptEnd = new Date(appt.endTime);
      const candidateEnd = new Date(candidate.getTime() + duration * 60000);
      if (candidateEnd <= apptStart) break;
      if (candidate >= apptEnd) continue;
      candidate = new Date(apptEnd);
    }

    const end = new Date(candidate.getTime() + duration * 60000);
    if (end > closeAt) return "";

    const hh = String(candidate.getHours()).padStart(2, "0");
    const mm = String(candidate.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }, [dayAppointments, selectedBarberId, selectedDate, selectedService?.durationMinutes]);

  const scheduleHint = useMemo(() => {
    if (!selectedDate || !selectedBarberId || !selectedService) return "";
    if (!selectedStartTime) return suggestedTime ? `Sugerencia: ${suggestedTime}` : "No hay espacios sugeridos para este dia.";

    const desiredStart = new Date(`${selectedDate}T${selectedStartTime}:00`);
    const desiredEnd = new Date(desiredStart.getTime() + selectedService.durationMinutes * 60000);
    const conflict = dayAppointments.some((item) => {
      if (item.status === "CANCELLED") return false;
      const start = new Date(item.startTime);
      const end = new Date(item.endTime);
      return desiredStart < end && desiredEnd > start;
    });

    if (conflict) return suggestedTime ? `Conflicto detectado. Prueba con ${suggestedTime}.` : "Conflicto detectado con otra cita.";
    return "Horario valido para confirmar.";
  }, [dayAppointments, selectedBarberId, selectedDate, selectedService, selectedStartTime, suggestedTime]);

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
        <span className="ml-2 text-sm text-neutral-500">Cargando datos...</span>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
          <div className="min-w-0">
            <p className="text-sm text-red-400">{serverError}</p>
            {serverErrorRequestId && (
              <p className="mt-0.5 font-mono text-[10px] text-red-400/60">
                ID: {serverErrorRequestId}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Cliente ── */}
      <div ref={searchContainerRef} className="relative">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">
          Cliente
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          {searchLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-500" />
          )}
          <input
            value={customerSearch}
            onChange={(e) => handleCustomerInput(e.target.value)}
            onFocus={() => {
              if (customerSearch.trim().length >= 2) setShowDropdown(true);
            }}
            placeholder="Buscar por nombre o teléfono..."
            autoComplete="off"
            className={`w-full rounded-xl border bg-white py-2.5 pl-10 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-background dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-600 ${
              errors.customerId
                ? "border-red-400 focus:ring-red-500/30 dark:border-red-500/50"
                : "border-neutral-300 focus:ring-primary/30 dark:border-neutral-700"
            }`}
          />
        </div>
        <input type="hidden" {...register("customerId")} />

        {errors.customerId && (
          <p className="mt-1 text-xs text-red-500 dark:text-red-400">
            {errors.customerId.message}
          </p>
        )}

        {selectedCustomer && !showDropdown && (
          <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
            ✓ {selectedCustomer.name}
            {selectedCustomer.totalVisits > 0
              ? ` · ${selectedCustomer.totalVisits} visita${selectedCustomer.totalVisits !== 1 ? "s" : ""}`
              : " · cliente nuevo"}
          </p>
        )}

        {/* Dropdown results */}
        {showDropdown && customerSearch.trim().length >= 2 && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
            {customerResults.length === 0 && !searchLoading ? (
              <div className="px-4 py-3 text-sm text-neutral-500">
                Sin resultados para &ldquo;{customerSearch}&rdquo;
              </div>
            ) : (
              customerResults.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectCustomer(c);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-primary dark:bg-indigo-500/20 dark:text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                      {c.name}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      {[c.phone, c.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                    </p>
                  </div>
                  {c.totalVisits > 0 && (
                    <span className="flex-shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                      {c.totalVisits}v
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Barbero ── */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">
          Barbero
        </label>
        {barbers.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
            No hay barberos activos. Agrega uno primero en la sección Barberos.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <input type="hidden" {...register("barberId")} />
            {barbers.map((b) => {
              const isSelected = selectedBarberId === b.id;
              const initial = b.user.name.charAt(0).toUpperCase();
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setValue("barberId", b.id, { shouldValidate: true })}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-white"
                      : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:border-neutral-600"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                      isSelected
                        ? "bg-indigo-500 text-white"
                        : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    {initial}
                  </span>
                  {b.user.name}
                  {b.specialty && (
                    <span className="text-xs opacity-60">· {b.specialty}</span>
                  )}
                  {isSelected && (
                    <CheckCircle className="h-3.5 w-3.5 text-indigo-500 dark:text-primary" />
                  )}
                </button>
              );
            })}
          </div>
        )}
        {errors.barberId && (
          <p className="mt-1 text-xs text-red-500 dark:text-red-400">
            {errors.barberId.message}
          </p>
        )}
      </div>

      {/* ── Fecha y hora ── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">
            Fecha
          </label>
          <div
            className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 dark:bg-neutral-900 ${
              errors.appointmentDate
                ? "border-red-400 dark:border-red-500/50"
                : "border-neutral-300 focus-within:ring-2 focus-within:ring-indigo-500/40 dark:border-neutral-700"
            }`}
          >
            <Calendar className="h-4 w-4 flex-shrink-0 text-indigo-500" />
            <input
              {...register("appointmentDate")}
              type="date"
              className="w-full bg-transparent text-sm text-neutral-900 focus:outline-none dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          {errors.appointmentDate && (
            <p className="mt-1 text-xs text-red-500 dark:text-red-400">
              {errors.appointmentDate.message}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">
            Hora
          </label>
          <div
            className={`flex items-center gap-2 rounded-xl border bg-white px-3 py-2.5 dark:bg-neutral-900 ${
              errors.startTime
                ? "border-red-400 dark:border-red-500/50"
                : "border-neutral-300 focus-within:ring-2 focus-within:ring-indigo-500/40 dark:border-neutral-700"
            }`}
          >
            <Clock className="h-4 w-4 flex-shrink-0 text-indigo-500" />
            <input
              {...register("startTime")}
              type="time"
              className="w-full bg-transparent text-sm text-neutral-900 focus:outline-none dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
            />
          </div>
          {errors.startTime && (
            <p className="mt-1 text-xs text-red-500 dark:text-red-400">
              {errors.startTime.message}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-xs text-indigo-700 dark:border-indigo-900/50 dark:bg-indigo-950/20 dark:text-indigo-200">
        <div className="flex items-center justify-between gap-2">
          <span>
            {loadingSuggestions
              ? "Calculando sugerencias..."
              : scheduleHint || "Selecciona barbero, fecha y servicio para recibir sugerencia."}
          </span>
          {suggestedTime && suggestedTime !== selectedStartTime ? (
            <button
              type="button"
              onClick={() => setValue("startTime", suggestedTime, { shouldValidate: true })}
              className="rounded-md border border-indigo-300 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200"
            >
              Aplicar {suggestedTime}
            </button>
          ) : null}
        </div>
      </div>

      {/* ── Servicio ── */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">
          Servicio
        </label>
        {services.length === 0 ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
            No hay servicios activos. Agrega uno primero en la sección Servicios.
          </p>
        ) : (
          <div className="space-y-2">
            <input type="hidden" {...register("serviceId")} />
            {services.map((s) => {
              const isSelected = selectedServiceId === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setValue("serviceId", s.id, { shouldValidate: true })}
                  className={`flex w-full items-center justify-between rounded-xl border-2 p-3 text-left transition-all ${
                    isSelected
                      ? "border-indigo-400 bg-indigo-50 dark:border-indigo-500/60 dark:bg-indigo-500/10"
                      : "border-transparent bg-neutral-50 hover:border-neutral-300 dark:bg-neutral-800/60 dark:hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                        isSelected
                          ? "bg-indigo-100 text-primary dark:bg-indigo-500/20 dark:text-primary"
                          : "bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400"
                      }`}
                    >
                      <Scissors className="h-4 w-4" />
                    </div>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          isSelected
                            ? "text-indigo-700 dark:text-white"
                            : "text-neutral-700 dark:text-neutral-200"
                        }`}
                      >
                        {s.name}
                      </p>
                      <p className="text-xs text-neutral-500">{s.durationMinutes} min</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-bold ${
                        isSelected
                          ? "text-primary dark:text-primary"
                          : "text-neutral-600 dark:text-neutral-300"
                      }`}
                    >
                      {formatCurrency(s.price, currency)}
                    </span>
                    {isSelected && (
                      <CheckCircle className="h-4 w-4 fill-current text-indigo-500 dark:text-primary" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {errors.serviceId && (
          <p className="mt-1 text-xs text-red-500 dark:text-red-400">
            {errors.serviceId.message}
          </p>
        )}
      </div>

      {/* ── Notas ── */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-500">
          Notas{" "}
          <span className="font-normal normal-case text-neutral-400">(opcional)</span>
        </label>
        <textarea
          {...register("notes")}
          rows={2}
          placeholder="Preferencias, instrucciones especiales..."
          className="w-full resize-none rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-1 focus:ring-offset-background dark:border-neutral-700 dark:bg-neutral-900 dark:text-white dark:placeholder:text-neutral-600"
        />
      </div>

      {/* ── Resumen + acciones ── */}
      <div className="border-t border-neutral-200 pt-4 dark:border-neutral-800">
        {selectedService && (
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-neutral-500">Total estimado</p>
              <p className="text-2xl font-bold text-neutral-900 dark:text-white">
                {formatCurrency(selectedService.price, currency)}
              </p>
            </div>
            <p className="text-sm text-neutral-500">{selectedService.durationMinutes} min</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSuccess}
            className="flex-1 rounded-xl border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-bold text-white transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              "Confirmar Cita"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

