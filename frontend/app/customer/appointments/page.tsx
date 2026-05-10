"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, Clock, Loader2, LogOut, Scissors, User } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DateChips, type DateChipItem } from "@/components/customer/DateChips";
import { TimeSlotGrid, type TimeSlotItem } from "@/components/customer/TimeSlotGrid";
import { Badge, PageLoader } from "@/components/ui";
import { CustomerPortalSidebar } from "@/components/customer/CustomerPortalSidebar";
import type { Appointment } from "@/types";

const TOKEN_KEY = "customer_portal_token";
const CUSTOMER_CANCEL_MIN_HOURS = 2;

interface CustomerMe {
  linkedBusinesses?: Array<{
    businessId: string;
    businessName: string;
    businessSlug?: string;
    customerName: string;
  }>;
}

interface BusinessCatalog {
  id: string;
  name: string;
  slug: string;
  services: Array<{ id: string; name: string; durationMinutes: number; price: number }>;
  barbers: Array<{ id: string; user: { name: string } }>;
}

interface AvailabilityResponse {
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  slotIntervalMinutes?: number;
  slots: TimeSlotItem[];
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistio",
};

const STATUS_VARIANTS: Record<string, "default" | "success" | "warning" | "error" | "info"> = {
  PENDING: "warning",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "error",
  NO_SHOW: "default",
};

function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function buildDateChips(days = 7): DateChipItem[] {
  return Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    return {
      value: toDateInputValue(date),
      label: format(date, "EEE", { locale: es }),
      subLabel: format(date, "dd/MM"),
      isToday: i === 0,
    };
  });
}

export default function CustomerAppointmentsPage() {
  const router = useRouter();
  const [me, setMe] = useState<CustomerMe | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [catalog, setCatalog] = useState<BusinessCatalog | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [selectedDate, setSelectedDate] = useState(toDateInputValue(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotItem | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cancelingId, setCancelingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const dateChips = useMemo(() => buildDateChips(7), []);
  const currentBusiness = me?.linkedBusinesses?.[0];

  const fetchBase = useCallback(async () => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) {
      router.replace("/customer/login" as never);
      return;
    }

    try {
      const meRes = await fetch("/api/proxy/api/v1/customer-portal/me", { headers: { Authorization: `Bearer ${token}` } });
      if (!meRes.ok) throw new Error("No se pudo cargar perfil");
      const meData = (await meRes.json()) as CustomerMe;
      setMe(meData);

      const slug = meData.linkedBusinesses?.[0]?.businessSlug;
      if (!slug) return;

      const [apptRes, catalogRes] = await Promise.all([
        fetch("/api/proxy/api/v1/customer-portal/my-appointments?upcoming=true&limit=20", { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/proxy/api/v1/customer-portal/businesses/${slug}/catalog`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (apptRes.ok) {
        const apptData = (await apptRes.json()) as { data?: Appointment[] };
        setAppointments(apptData.data ?? []);
      }

      if (catalogRes.ok) {
        const catalogData = (await catalogRes.json()) as BusinessCatalog;
        setCatalog(catalogData);
        setServiceId((prev) => prev || catalogData.services[0]?.id || "");
        setBarberId((prev) => prev || catalogData.barbers[0]?.id || "");
      }
    } catch {
      setError("No se pudo cargar tu portal de citas.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const fetchAvailability = useCallback(async () => {
    if (!currentBusiness?.businessSlug || !serviceId || !barberId || !selectedDate) return;
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;
    setLoadingAvailability(true);
    try {
      const params = new URLSearchParams({ serviceId, barberId, date: selectedDate });
      const res = await fetch(`/api/proxy/api/v1/customer-portal/businesses/${currentBusiness.businessSlug}/availability?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        setAvailability((await res.json()) as AvailabilityResponse);
      }
    } finally {
      setLoadingAvailability(false);
    }
  }, [barberId, currentBusiness?.businessSlug, selectedDate, serviceId]);

  useEffect(() => {
    void fetchBase();
  }, [fetchBase]);

  useEffect(() => {
    void fetchAvailability();
  }, [fetchAvailability]);

  async function requestAppointment() {
    if (!currentBusiness?.businessSlug || !selectedSlot?.available || !serviceId || !barberId) return;
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/proxy/api/v1/customer-portal/businesses/${currentBusiness.businessSlug}/request-appointment`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ serviceId, barberId, startTime: selectedSlot.startTime, notes: notes || undefined }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload?.error?.message ?? "No se pudo solicitar la cita");
        return;
      }
      setSuccess("Cita solicitada correctamente.");
      setSelectedSlot(null);
      setNotes("");
      await fetchBase();
      await fetchAvailability();
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelAppointment(id: string) {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;
    setCancelingId(id);
    setError("");
    try {
      const res = await fetch(`/api/proxy/api/v1/customer-portal/my-appointments/${id}/cancel`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        setError(payload?.error?.message ?? "No se pudo cancelar");
        return;
      }
      setSuccess("Cita cancelada correctamente.");
      await fetchBase();
      await fetchAvailability();
    } finally {
      setCancelingId("");
    }
  }

  function canCancelAppointment(appt: Appointment) {
    if (!["PENDING", "CONFIRMED"].includes(appt.status)) return false;
    const startsAt = new Date(appt.startTime).getTime();
    return startsAt - Date.now() >= CUSTOMER_CANCEL_MIN_HOURS * 60 * 60 * 1000;
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><PageLoader /></div>;
  }

  return (
    <div className="min-h-screen bg-surface px-4 py-5 text-on-surface sm:px-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-2xl border bg-surface-container p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-on-primary"><Scissors className="h-5 w-5" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Portal Cliente</p>
                <h1 className="text-lg font-semibold">{currentBusiness?.businessName ?? "Tu barberia"}</h1>
              </div>
            </div>
            <button className="rounded-lg border px-3 py-1.5 text-sm" onClick={() => { sessionStorage.removeItem(TOKEN_KEY); router.replace("/customer/login" as never); }}>
              <span className="inline-flex items-center gap-1"><LogOut className="h-4 w-4" /> Salir</span>
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="space-y-4">
            <div className="rounded-2xl border bg-surface-container p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold">Solicitar cita</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <select className="h-10 rounded-lg border bg-surface px-3" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setSelectedSlot(null); }}>
                  {catalog?.services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min)</option>)}
                </select>
                <select className="h-10 rounded-lg border bg-surface px-3" value={barberId} onChange={(e) => { setBarberId(e.target.value); setSelectedSlot(null); }}>
                  {catalog?.barbers.map((b) => <option key={b.id} value={b.id}>{b.user.name}</option>)}
                </select>
              </div>

              <div className="mt-3"><DateChips items={dateChips} selectedValue={selectedDate} onSelect={(value) => { setSelectedDate(value); setSelectedSlot(null); }} /></div>

              <div className="mt-3 rounded-xl border bg-surface-container-high/60 p-3">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Horarios disponibles</span>
                  {loadingAvailability ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                </div>
                {availability?.isOpen === false ? <p className="text-xs text-amber-600">La barberia no atiende en este dia.</p> : null}
                {availability?.isOpen ? <TimeSlotGrid slots={availability.slots} selectedStartTime={selectedSlot?.startTime ?? ""} onSelect={setSelectedSlot} /> : null}
              </div>

              <input className="mt-3 h-10 w-full rounded-lg border bg-surface px-3" placeholder="Nota (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

              <button disabled={submitting || !selectedSlot?.available} onClick={() => void requestAppointment()} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary text-on-primary disabled:opacity-50">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />} Solicitar cita
              </button>
            </div>

            {success ? <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{success}</span></div> : null}
            {error ? <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

            <div className="rounded-2xl border bg-surface-container p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold">Tus proximas citas</h2>
              <div className="space-y-2">
                {appointments.length === 0 ? <p className="text-sm text-muted-foreground">No tienes citas proximas.</p> : appointments.map((appt) => (
                  <div key={appt.id} className="rounded-xl border bg-surface p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium capitalize">{format(new Date(appt.startTime), "EEEE d 'de' MMMM", { locale: es })}</p>
                        <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-2"><Clock className="h-3 w-3" /> {format(new Date(appt.startTime), "HH:mm")} <User className="ml-2 h-3 w-3" /> {appt.barber?.user?.name ?? "Barbero"}</p>
                        <p className="text-xs text-muted-foreground">{appt.service?.name ?? "Servicio"}</p>
                      </div>
                      <Badge variant={STATUS_VARIANTS[appt.status] ?? "default"}>{STATUS_LABELS[appt.status] ?? appt.status}</Badge>
                    </div>
                    {canCancelAppointment(appt) ? (
                      <button disabled={cancelingId === appt.id} onClick={() => void cancelAppointment(appt.id)} className="mt-2 rounded-md border px-2.5 py-1 text-xs text-red-600">
                        {cancelingId === appt.id ? "Cancelando..." : "Cancelar"}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="hidden lg:block">
            <CustomerPortalSidebar
              linkedBusinessCount={currentBusiness ? 1 : 0}
              totalAppointments={appointments.length}
              pendingAppointments={appointments.filter((a) => a.status === "PENDING").length}
              confirmedAppointments={appointments.filter((a) => a.status === "CONFIRMED").length}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
