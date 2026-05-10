"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ListFilter, Plus, Table2, WandSparkles, Lock, Users, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { AppointmentCalendar } from "@/components/appointments/AppointmentCalendar";
import { AppointmentTable } from "@/components/appointments/AppointmentTable";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";
import { Modal } from "@/components/ui/Modal";
import { Badge, Button, PageLoader } from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";
import { useAppointments } from "@/hooks/useAppointments";
import { api } from "@/lib/api";
import { AppointmentStatus } from "@/types";

const statuses: Array<AppointmentStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
];

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type WaitlistStatus = "PENDING" | "CONTACTED" | "BOOKED" | "CANCELLED";
interface WaitlistEntry {
  id: string;
  customer?: { id: string; name: string; phone?: string };
  barber?: { id: string; user?: { name?: string } };
  service?: { id: string; name?: string };
  preferredTime?: string;
  status: WaitlistStatus;
}

interface ScheduleBlock {
  id: string;
  barber?: { id: string; user?: { name?: string } };
  startsAt: string;
  endsAt: string;
  reason?: string;
}

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState<string>(toDateInputValue(new Date()));
  const [selectedStatus, setSelectedStatus] = useState<AppointmentStatus | "ALL">("ALL");
  const [selectedBarberId, setSelectedBarberId] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [barbers, setBarbers] = useState<Array<{ id: string; name: string }>>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [blockBarberId, setBlockBarberId] = useState("");
  const [blockStartsAt, setBlockStartsAt] = useState("");
  const [blockEndsAt, setBlockEndsAt] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const { appointments, pagination, loading, connected, error, refetch } = useAppointments({
    date: selectedDate,
    status: selectedStatus,
    barberId: selectedBarberId,
    page,
    limit: viewMode === "calendar" ? 100 : 20,
  });

  useEffect(() => {
    const loadBarbers = async () => {
      try {
        const data = await api.get<Array<{ id: string; user?: { name?: string } }>>("/api/v1/barbers");
        setBarbers(
          data.map((barber) => ({
            id: barber.id,
            name: barber.user?.name ?? barber.id,
          })),
        );
      } catch {
        setBarbers([]);
      }
    };
    void loadBarbers();
  }, []);

  useEffect(() => {
    const loadScheduleData = async () => {
      setScheduleLoading(true);
      try {
        const [waitlistData, blocksData] = await Promise.all([
          api.get<WaitlistEntry[]>("/api/v1/schedule/waitlist"),
          api.get<ScheduleBlock[]>("/api/v1/schedule/blocks"),
        ]);
        setWaitlist(waitlistData);
        setBlocks(blocksData);
      } catch {
        setWaitlist([]);
        setBlocks([]);
      } finally {
        setScheduleLoading(false);
      }
    };
    void loadScheduleData();
  }, []);

  const summary = useMemo(() => {
    const total = pagination.total || appointments.length;
    const completed = appointments.filter((item) => item.status === "COMPLETED").length;
    const pending = appointments.filter((item) => item.status === "PENDING").length;
    const confirmed = appointments.filter((item) => item.status === "CONFIRMED").length;
    return { total, completed, pending, confirmed };
  }, [appointments, pagination.total]);

  const assistantTips = useMemo(() => {
    const tips: string[] = [];
    if (summary.pending > 0) tips.push(`Tienes ${summary.pending} cita(s) pendiente(s). Prioriza confirmarlas para reducir ausencias.`);
    if (waitlist.filter((w) => w.status === "PENDING").length > 0) {
      tips.push(`Hay clientes en lista de espera. Si se libera un horario, márcalos como CONTACTED o BOOKED.`);
    }
    const noShowCount = appointments.filter((a) => a.status === "NO_SHOW").length;
    if (noShowCount > 0) tips.push(`Detectamos ${noShowCount} no-show hoy. Considera recordatorios y doble confirmación.`);
    if (tips.length === 0) tips.push("Agenda estable. Mantén confirmaciones al día y revisa disponibilidad cada cambio.");
    return tips.slice(0, 3);
  }, [appointments, summary.pending, waitlist]);

  const formattedDate = useMemo(() => {
    const date = new Date(`${selectedDate}T00:00:00`);
    if (Number.isNaN(date.getTime())) return selectedDate;
    return format(date, "EEEE d 'de' MMMM", { locale: es });
  }, [selectedDate]);

  const moveDay = (direction: -1 | 1): void => {
    const date = new Date(`${selectedDate}T00:00:00`);
    date.setDate(date.getDate() + direction);
    setSelectedDate(toDateInputValue(date));
    setPage(1);
  };

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    setPage(1);
  };

  const handleStatusChange = (value: AppointmentStatus | "ALL") => {
    setSelectedStatus(value);
    setPage(1);
  };

  const handleBarberChange = (value: string) => {
    setSelectedBarberId(value);
    setPage(1);
  };

  const refreshSchedule = async () => {
    try {
      const [waitlistData, blocksData] = await Promise.all([
        api.get<WaitlistEntry[]>("/api/v1/schedule/waitlist"),
        api.get<ScheduleBlock[]>("/api/v1/schedule/blocks"),
      ]);
      setWaitlist(waitlistData);
      setBlocks(blocksData);
    } catch {
      // no-op
    }
  };

  const createBlock = async () => {
    if (!blockBarberId || !blockStartsAt || !blockEndsAt) return;
    await api.post("/api/v1/schedule/blocks", {
      barberId: blockBarberId,
      startsAt: new Date(blockStartsAt).toISOString(),
      endsAt: new Date(blockEndsAt).toISOString(),
      reason: blockReason || undefined,
    });
    setBlockStartsAt("");
    setBlockEndsAt("");
    setBlockReason("");
    await refreshSchedule();
    await refetch();
  };

  const updateWaitlistStatus = async (id: string, status: WaitlistStatus) => {
    await api.patch(`/api/v1/schedule/waitlist/${id}/status`, { status });
    await refreshSchedule();
  };

  return (
    <div className="w-full space-y-6 px-4 py-5 sm:px-6 lg:px-8 xl:px-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Citas</h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {summary.total} citas para {formattedDate}
            </p>
          </div>
          <span
            title={connected ? "Tiempo real activo" : "Desconectado"}
            className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
              connected ? "bg-emerald-500 shadow-md shadow-emerald-500/50" : "bg-neutral-400 dark:bg-neutral-600"
            }`}
          />
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva cita
        </Button>
      </div>

      <div className="grid gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:grid-cols-4">
        <div className="col-span-2 flex items-center gap-2">
          <Button size="sm" variant="subtle" onClick={() => moveDay(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => handleDateChange(event.target.value)}
            className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          />
          <Button size="sm" variant="subtle" onClick={() => moveDay(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedDate(toDateInputValue(new Date()))}>
            Hoy
          </Button>
        </div>
        <select
          value={selectedStatus}
          onChange={(event) => handleStatusChange(event.target.value as AppointmentStatus | "ALL")}
          className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status === "ALL" ? "Todos los estados" : status}
            </option>
          ))}
        </select>
        <select
          value={selectedBarberId}
          onChange={(event) => handleBarberChange(event.target.value)}
          className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <option value="ALL">Todos los barberos</option>
          {barbers.map((barber) => (
            <option key={barber.id} value={barber.id}>
              {barber.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Total</p>
          <p className="text-lg font-semibold text-neutral-900 dark:text-white">{summary.total}</p>
        </div>
        <div className="rounded-lg border border-sky-200 bg-sky-50/70 px-3 py-2 dark:border-sky-900/60 dark:bg-sky-950/20">
          <p className="text-[11px] uppercase tracking-wide text-sky-700 dark:text-sky-300">Confirmadas</p>
          <p className="text-lg font-semibold text-sky-800 dark:text-sky-200">{summary.confirmed}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 dark:border-amber-900/60 dark:bg-amber-950/20">
          <p className="text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-300">Pendientes</p>
          <p className="text-lg font-semibold text-amber-800 dark:text-amber-200">{summary.pending}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <p className="text-[11px] uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Completadas</p>
          <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">{summary.completed}</p>
        </div>
      </div>

      <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
        <div className="mb-2 flex items-center gap-2">
          <WandSparkles className="h-4 w-4 text-primary dark:text-indigo-300" />
          <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">Asistente operativo</p>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {assistantTips.map((tip) => (
            <div key={tip} className="rounded-lg border border-indigo-200/70 bg-white/90 px-3 py-2 text-xs text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">
              {tip}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="info" className="hidden sm:inline-flex">Confirmadas: {summary.confirmed}</Badge>
        <Badge variant="warning" className="hidden sm:inline-flex">Pendientes: {summary.pending}</Badge>
        <Badge variant="success" className="hidden sm:inline-flex">Completadas: {summary.completed}</Badge>
        <Button
          size="sm"
          variant={viewMode === "calendar" ? "default" : "subtle"}
          className="ml-auto gap-1"
          onClick={() => setViewMode("calendar")}
        >
          <CalendarDays className="h-4 w-4" />
          Calendario
        </Button>
        <Button size="sm" variant={viewMode === "table" ? "default" : "subtle"} className="gap-1" onClick={() => setViewMode("table")}>
          <Table2 className="h-4 w-4" />
          Tabla
        </Button>
        <Button size="sm" variant="ghost" className="gap-1" onClick={() => void refetch()}>
          <ListFilter className="h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">No se pudieron cargar las citas</p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-400/90">{error}</p>
        </div>
      ) : appointments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-white py-16 dark:border-neutral-800 dark:bg-neutral-900/50">
          <CalendarDays className="mb-3 h-10 w-10 text-neutral-400 dark:text-neutral-700" />
          <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Sin citas registradas</p>
          <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-600">Crea la primera cita para comenzar</p>
          <Button className="mt-4" size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Nueva cita
          </Button>
        </div>
      ) : (
        <>
          {viewMode === "calendar" ? (
            <AppointmentCalendar appointments={appointments} />
          ) : (
            <AppointmentTable appointments={appointments} onChanged={() => void refetch()} />
          )}
          {viewMode === "table" && pagination.pages > 1 && (
            <Pagination
              page={pagination.page}
              pages={pagination.pages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={setPage}
              className="mt-4"
            />
          )}
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-3 flex items-center gap-2">
            <Lock className="h-4 w-4 text-neutral-500" />
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Bloqueos de agenda</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              value={blockBarberId}
              onChange={(e) => setBlockBarberId(e.target.value)}
              className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              <option value="">Selecciona barbero</option>
              {barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>{barber.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Motivo (opcional)"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
            <input
              type="datetime-local"
              value={blockStartsAt}
              onChange={(e) => setBlockStartsAt(e.target.value)}
              className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
            <input
              type="datetime-local"
              value={blockEndsAt}
              onChange={(e) => setBlockEndsAt(e.target.value)}
              className="h-9 rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            />
          </div>
          <Button size="sm" className="mt-2" onClick={() => void createBlock()}>
            Crear bloqueo
          </Button>
          <div className="mt-3 space-y-2">
            {scheduleLoading ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Cargando bloqueos...</p>
            ) : blocks.length === 0 ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Sin bloqueos registrados.</p>
            ) : (
              blocks.slice(0, 6).map((block) => (
                <div key={block.id} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs dark:border-neutral-800 dark:bg-neutral-950/40">
                  <p className="font-medium text-neutral-800 dark:text-neutral-200">{block.barber?.user?.name ?? "Barbero"}</p>
                  <p className="text-neutral-600 dark:text-neutral-400">
                    {new Date(block.startsAt).toLocaleString("es")} - {new Date(block.endsAt).toLocaleString("es")}
                  </p>
                  {block.reason ? <p className="text-neutral-500 dark:text-neutral-500">{block.reason}</p> : null}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-neutral-500" />
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Lista de espera</h2>
          </div>
          <div className="space-y-2">
            {scheduleLoading ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Cargando lista de espera...</p>
            ) : waitlist.length === 0 ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Sin clientes en espera.</p>
            ) : (
              waitlist.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs dark:border-neutral-800 dark:bg-neutral-950/40">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-neutral-800 dark:text-neutral-200">{item.customer?.name ?? "Cliente"}</p>
                      <p className="text-neutral-600 dark:text-neutral-400">
                        {item.service?.name ?? "Servicio"} {item.preferredTime ? `· ${item.preferredTime}` : ""}
                      </p>
                    </div>
                    <Badge variant={item.status === "PENDING" ? "warning" : item.status === "BOOKED" ? "success" : "default"}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <Button size="sm" variant="subtle" onClick={() => void updateWaitlistStatus(item.id, "CONTACTED")}>Contactado</Button>
                    <Button size="sm" variant="subtle" onClick={() => void updateWaitlistStatus(item.id, "BOOKED")} className="gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Reservado
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void updateWaitlistStatus(item.id, "CANCELLED")}>Cancelar</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Modal */}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Nueva cita"
        size="lg"
      >
        <AppointmentForm onSuccess={() => setOpen(false)} />
      </Modal>
    </div>
  );
}

