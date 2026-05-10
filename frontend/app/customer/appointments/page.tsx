"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  LogOut,
  Scissors,
  Sparkles,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
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

function buildDateChips(days = 9): DateChipItem[] {
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

function money(value?: number | string) {
  if (value === undefined || value === null || value === "") return "";
  return `S/. ${Number(value).toFixed(2)}`;
}

function appointmentDateLabel(value: string) {
  return format(new Date(value), "EEE d MMM", { locale: es });
}

function appointmentLongDate(value: string) {
  return format(new Date(value), "EEEE d 'de' MMMM", { locale: es });
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

  const dateChips = useMemo(() => buildDateChips(9), []);
  const currentBusiness = me?.linkedBusinesses?.[0];
  const selectedService = catalog?.services.find((service) => service.id === serviceId);
  const selectedBarber = catalog?.barbers.find((barber) => barber.id === barberId);
  const pendingCount = appointments.filter((a) => a.status === "PENDING").length;
  const confirmedCount = appointments.filter((a) => a.status === "CONFIRMED").length;

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
    return <div className="flex min-h-screen items-center justify-center bg-zinc-950"><PageLoader /></div>;
  }

  return (
    <div className="min-h-screen overflow-hidden bg-zinc-950 text-zinc-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(251,191,36,0.16),transparent_26rem),radial-gradient(circle_at_85%_0%,rgba(255,255,255,0.08),transparent_22rem)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:42px_42px] opacity-70 [mask-image:linear-gradient(180deg,black,transparent_72%)]" />

      <main className="relative mx-auto flex max-w-6xl flex-col gap-4 px-4 pb-24 pt-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5 lg:pb-8 lg:pt-6">
        <section className="space-y-4">
          <header className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                  <Scissors className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Portal cliente</p>
                  <h1 className="truncate text-2xl font-black tracking-tight sm:text-3xl">{currentBusiness?.businessName ?? "Tu barberia"}</h1>
                  <p className="mt-1 text-sm text-zinc-400">Agenda, revisa y gestiona tus citas en segundos.</p>
                </div>
              </div>
              <button className="inline-flex h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 text-sm font-semibold text-zinc-300 transition hover:bg-white/[0.1]" onClick={() => { sessionStorage.removeItem(TOKEN_KEY); router.replace("/customer/login" as never); }}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Proximas</p>
                <p className="text-xl font-black">{appointments.length}</p>
              </div>
              <div className="rounded-2xl border border-primary/25 bg-primary/10 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Pendientes</p>
                <p className="text-xl font-black text-primary">{pendingCount}</p>
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300">Confirmadas</p>
                <p className="text-xl font-black text-emerald-200">{confirmedCount}</p>
              </div>
            </div>
          </header>

          {success ? <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200"><span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" />{success}</span></div> : null}
          {error ? <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}

          <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Reserva guiada
                </div>
                <h2 className="mt-3 text-xl font-black tracking-tight">Elige tu siguiente cita</h2>
                <p className="mt-1 text-sm text-zinc-400">Selecciona servicio, barbero y un horario libre.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Servicio</span>
                <select className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-zinc-100 outline-none focus:border-primary/50" value={serviceId} onChange={(e) => { setServiceId(e.target.value); setSelectedSlot(null); }}>
                  {catalog?.services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes} min)</option>)}
                </select>
              </label>
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Barbero</span>
                <select className="h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-zinc-100 outline-none focus:border-primary/50" value={barberId} onChange={(e) => { setBarberId(e.target.value); setSelectedSlot(null); }}>
                  {catalog?.barbers.map((b) => <option key={b.id} value={b.id}>{b.user.name}</option>)}
                </select>
              </label>
            </div>

            <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/20 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">Fecha</p>
                <p className="text-xs text-zinc-500">Desliza para ver mas</p>
              </div>
              <DateChips items={dateChips} selectedValue={selectedDate} onSelect={(value) => { setSelectedDate(value); setSelectedSlot(null); }} />
            </div>

            <div className="mt-4 rounded-[1.35rem] border border-white/10 bg-black/20 p-3">
              <div className="mb-3 flex items-center justify-between text-xs text-zinc-400">
                <span className="font-bold uppercase tracking-[0.16em] text-zinc-500">Horarios disponibles</span>
                {loadingAvailability ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span>{availability?.slots?.filter((s) => s.available).length ?? 0} libres</span>}
              </div>
              {availability?.isOpen === false ? <p className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-xs text-amber-200">La barberia no atiende en este dia.</p> : null}
              {availability?.isOpen ? <TimeSlotGrid slots={availability.slots} selectedStartTime={selectedSlot?.startTime ?? ""} onSelect={setSelectedSlot} /> : null}
            </div>

            <textarea className="mt-4 min-h-20 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-primary/50" placeholder="Nota para la barberia (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

            <div className="sticky bottom-3 z-10 mt-4 rounded-2xl border border-white/10 bg-zinc-950/80 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl sm:static sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
              <div className="mb-2 flex items-center justify-between px-1 text-xs text-zinc-400 sm:hidden">
                <span>{selectedService?.name ?? "Servicio"}</span>
                <span>{selectedSlot?.startLabel ?? "Elige hora"}</span>
              </div>
              <button disabled={submitting || !selectedSlot?.available} onClick={() => void requestAppointment()} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />} Solicitar cita
              </button>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Agenda</p>
                <h2 className="text-xl font-black tracking-tight">Tus proximas citas</h2>
              </div>
              <Badge variant="info">{appointments.length} activas</Badge>
            </div>

            <div className="space-y-3">
              {appointments.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 px-5 py-10 text-center">
                  <CalendarDays className="mx-auto mb-3 h-9 w-9 text-zinc-600" />
                  <p className="text-sm font-bold text-zinc-300">Aun no tienes citas proximas</p>
                  <p className="mt-1 text-xs text-zinc-500">Elige un horario libre arriba y solicita tu cita.</p>
                </div>
              ) : appointments.map((appt) => (
                <article key={appt.id} className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/24 p-4 shadow-xl shadow-black/20">
                  <div className="absolute left-0 top-0 h-full w-1 bg-primary/80" />
                  <div className="flex items-start justify-between gap-3 pl-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{appointmentDateLabel(appt.startTime)}</p>
                      <h3 className="mt-1 truncate text-lg font-black text-zinc-50">{appt.service?.name ?? "Servicio"}</h3>
                      <p className="mt-1 text-sm capitalize text-zinc-400">{appointmentLongDate(appt.startTime)}</p>
                    </div>
                    <Badge variant={STATUS_VARIANTS[appt.status] ?? "default"}>{STATUS_LABELS[appt.status] ?? appt.status}</Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 pl-2 sm:grid-cols-4">
                    <div className="rounded-2xl bg-white/[0.055] p-3">
                      <Clock className="mb-1 h-4 w-4 text-primary" />
                      <p className="text-[11px] text-zinc-500">Hora</p>
                      <p className="text-sm font-bold">{format(new Date(appt.startTime), "HH:mm")}</p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.055] p-3">
                      <User className="mb-1 h-4 w-4 text-primary" />
                      <p className="text-[11px] text-zinc-500">Barbero</p>
                      <p className="truncate text-sm font-bold">{appt.barber?.user?.name ?? "Barbero"}</p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.055] p-3">
                      <Wallet className="mb-1 h-4 w-4 text-primary" />
                      <p className="text-[11px] text-zinc-500">Precio</p>
                      <p className="text-sm font-bold">{money(appt.finalPrice ?? appt.service?.price) || "-"}</p>
                    </div>
                    <div className="rounded-2xl bg-white/[0.055] p-3">
                      <Scissors className="mb-1 h-4 w-4 text-primary" />
                      <p className="text-[11px] text-zinc-500">Duracion</p>
                      <p className="text-sm font-bold">{appt.service?.durationMinutes ?? "--"} min</p>
                    </div>
                  </div>

                  {canCancelAppointment(appt) ? (
                    <button disabled={cancelingId === appt.id} onClick={() => void cancelAppointment(appt.id)} className="ml-2 mt-3 inline-flex items-center gap-2 rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-200 transition hover:bg-red-500/15 disabled:opacity-50">
                      <XCircle className="h-3.5 w-3.5" />
                      {cancelingId === appt.id ? "Cancelando..." : "Cancelar cita"}
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="hidden lg:block">
          <CustomerPortalSidebar
            linkedBusinessCount={currentBusiness ? 1 : 0}
            totalAppointments={appointments.length}
            pendingAppointments={pendingCount}
            confirmedAppointments={confirmedCount}
          />
        </aside>
      </main>
    </div>
  );
}
