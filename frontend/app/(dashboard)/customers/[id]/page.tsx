"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const go = (router: ReturnType<typeof useRouter>, path: string) => router.push(path as any);
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Loader2,
  Mail,
  Menu,
  Pencil,
  Phone,
  Save,
  Sparkles,
  Star,
  UserX,
  X,
} from "lucide-react";
import { Badge, Button, Input, Label, PageLoader, Textarea } from "@/components/ui";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { useCurrency } from "@/contexts/CurrencyContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  birthDate: string | null;
  totalVisits: number;
  totalSpent: string;
  lastVisitAt: string | null;
  isActive: boolean;
  createdAt: string;
  preferredBarber: { id: string; user: { name: string } } | null;
  createdBy: { id: string; name: string } | null;
  accountLink: { id: string; linkedAt: string } | null;
}

interface AppointmentHistoryItem {
  id: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  finalPrice: string | null;
  notes: string | null;
  service: { id: string; name: string; price: string; durationMinutes: number };
  barber: { id: string; user: { id: string; name: string } };
}

interface HistoryResponse {
  data: AppointmentHistoryItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

type EditForm = {
  name: string;
  phone: string;
  email: string;
  notes: string;
  birthDate: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusLabel: Record<AppointmentHistoryItem["status"], string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistió",
};

const statusVariant: Record<
  AppointmentHistoryItem["status"],
  "default" | "success" | "warning" | "error" | "info" | "indigo"
> = {
  PENDING: "warning",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "error",
  NO_SHOW: "default",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}


// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className={cn("mb-1 flex h-8 w-8 items-center justify-center rounded-lg", color)}>
        {icon}
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className="text-xl font-bold text-neutral-900 dark:text-white">{value}</p>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const { currency } = useCurrency();
  const role = session?.user?.role ?? "";

  const canEdit = ["OWNER", "ADMIN", "RECEPTIONIST"].includes(role);
  const canDelete = ["OWNER", "ADMIN"].includes(role);

  // ── Customer state ────────────────────────────────────────────────────────────
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ── History state ─────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);

  // ── Edit modal ────────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    phone: "",
    email: "",
    notes: "",
    birthDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editDone, setEditDone] = useState(false);

  // ── Deactivate confirm ────────────────────────────────────────────────────────
  const [deactivating, setDeactivating] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────────

  async function loadCustomer(): Promise<void> {
    setLoadingCustomer(true);
    try {
      const data = await api.get<Customer>(`/api/v1/customers/${id}`);
      setCustomer(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoadingCustomer(false);
    }
  }

  async function loadHistory(page = 1): Promise<void> {
    setLoadingHistory(true);
    try {
      const data = await api.get<HistoryResponse>(
        `/api/v1/customers/${id}/history?page=${page}&limit=8`,
      );
      setHistory(data);
    } catch {
      setHistory({ data: [], total: 0, page, limit: 8, pages: 0 });
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    void loadCustomer();
    void loadHistory(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!mobilePanelOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobilePanelOpen]);

  // ── Edit ──────────────────────────────────────────────────────────────────────

  function openEdit() {
    if (!customer) return;
    setEditForm({
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      notes: customer.notes ?? "",
      birthDate: customer.birthDate
        ? new Date(customer.birthDate).toISOString().split("T")[0]
        : "",
    });
    setEditError("");
    setEditDone(false);
    setEditOpen(true);
  }

  async function submitEdit(): Promise<void> {
    setSaving(true);
    setEditError("");
    setEditDone(false);
    try {
      const body: Record<string, string | undefined | null> = { name: editForm.name };
      body.phone = editForm.phone || null;
      body.email = editForm.email || null;
      body.notes = editForm.notes || null;
      body.birthDate = editForm.birthDate
        ? new Date(editForm.birthDate).toISOString()
        : null;

      const updated = await api.patch<Customer>(`/api/v1/customers/${id}`, body);
      setCustomer(updated);
      setEditDone(true);
      setTimeout(() => setEditOpen(false), 800);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setEditError(e?.message ?? "Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────────

  async function toggleActive(): Promise<void> {
    if (!customer) return;
    const confirm = window.confirm(
      customer.isActive
        ? `¿Desactivar al cliente ${customer.name}? Ya no aparecerá en las búsquedas.`
        : `¿Reactivar al cliente ${customer.name}?`,
    );
    if (!confirm) return;
    setDeactivating(true);
    try {
      const updated = await api.put<Customer>(`/api/v1/customers/${id}`, {
        isActive: !customer.isActive,
      });
      setCustomer(updated);
    } finally {
      setDeactivating(false);
    }
  }

  // ── History pagination ────────────────────────────────────────────────────────

  function changePage(p: number) {
    setHistoryPage(p);
    void loadHistory(p);
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  if (loadingCustomer) return <PageLoader />;

  if (notFound || !customer) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-neutral-500">Cliente no encontrado.</p>
        <Button variant="outline" onClick={() => go(router, "/customers")}>
          <ArrowLeft className="h-4 w-4" /> Volver a clientes
        </Button>
      </div>
    );
  }

  const totalSpentNum = parseFloat(customer.totalSpent ?? "0");

  return (
    <div className="w-full space-y-6 px-4 py-5 sm:px-6 lg:px-7 xl:px-8 animate-fade-in">
      {/* Breadcrumb + back */}
      <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
        <button
          type="button"
          onClick={() => go(router, "/customers")}
          className="flex items-center gap-1 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Clientes
        </button>
        <span>/</span>
        <span className="truncate font-medium text-neutral-800 dark:text-neutral-200">
          {customer.name}
        </span>
      </div>

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="bg-orb-indigo-soft pointer-events-none absolute inset-0" />
        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-primary dark:bg-indigo-500/20 dark:text-primary">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                {customer.name}
              </h1>
              {!customer.isActive && <Badge variant="default">Inactivo</Badge>}
              {customer.accountLink && (
                <Badge variant="indigo">Portal vinculado</Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
              {customer.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {customer.email}
                </span>
              )}
              {customer.birthDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(customer.birthDate)}
                </span>
              )}
            </div>
            {customer.preferredBarber && (
              <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                <Star className="h-3 w-3 text-amber-400" />
                Barbero preferido: {customer.preferredBarber.user.name}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="relative mt-4 flex items-center justify-between gap-2 sm:hidden">
          <Button
            size="sm"
            variant="subtle"
            className="rounded-xl bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            onClick={() => setMobilePanelOpen(true)}
          >
            <Menu className="h-3.5 w-3.5" />
            Panel
          </Button>
          <Button
            size="sm"
            className="rounded-xl"
            onClick={() => go(router, `/appointments/new?customerId=${customer.id}`)}
          >
            <Calendar className="h-3.5 w-3.5" />
            Agendar
          </Button>
        </div>

        <div className="relative mt-4 hidden shrink-0 gap-2 sm:flex">
          {canEdit && (
            <Button size="sm" variant="outline" onClick={openEdit}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              go(router, `/appointments/new?customerId=${customer.id}`)
            }
          >
            <Calendar className="h-3.5 w-3.5" />
            Agendar cita
          </Button>
          {canDelete && (
            <Button
              size="sm"
              variant={customer.isActive ? "destructive" : "outline"}
              onClick={() => void toggleActive()}
              disabled={deactivating}
            >
              {deactivating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserX className="h-3.5 w-3.5" />
              )}
              {customer.isActive ? "Desactivar" : "Reactivar"}
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Visitas totales"
          value={customer.totalVisits}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          color="bg-emerald-50 dark:bg-emerald-500/10"
        />
        <StatCard
          label="Total gastado"
          value={formatCurrency(totalSpentNum, currency)}
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          color="bg-indigo-50 dark:bg-indigo-500/10"
        />
        <StatCard
          label="Última visita"
          value={customer.lastVisitAt ? formatDate(customer.lastVisitAt) : "—"}
          icon={<Clock className="h-4 w-4 text-amber-600" />}
          color="bg-amber-50 dark:bg-amber-500/10"
        />
        <StatCard
          label="Cliente desde"
          value={formatDate(customer.createdAt)}
          icon={<Calendar className="h-4 w-4 text-neutral-500" />}
          color="bg-neutral-100 dark:bg-neutral-800"
        />
      </div>

      {/* Notes */}
      {customer.notes && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Notas internas
          </h2>
          <p className="whitespace-pre-wrap text-sm text-neutral-600 dark:text-neutral-400">
            {customer.notes}
          </p>
        </div>
      )}

      {/* Appointment history */}
      <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
            Historial de citas
          </h2>
          {history && (
            <span className="text-xs text-neutral-400">{history.total} citas</span>
          )}
        </div>

        {loadingHistory ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
          </div>
        ) : !history || history.data.length === 0 ? (
          <div className="py-12 text-center">
            <Calendar className="mx-auto mb-3 h-8 w-8 text-neutral-300 dark:text-neutral-700" />
            <p className="text-sm font-medium text-neutral-500">Sin citas registradas</p>
            <p className="mt-0.5 text-xs text-neutral-400">
              Las citas de este cliente aparecerán aquí.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 dark:border-neutral-800">
                    {["Fecha", "Hora", "Servicio", "Barbero", "Estado", "Precio"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-neutral-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {history.data.map((appt) => (
                    <tr
                      key={appt.id}
                      className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <td className="px-5 py-3 text-neutral-700 dark:text-neutral-300">
                        {formatDate(appt.appointmentDate)}
                      </td>
                      <td className="px-5 py-3 text-neutral-500">
                        {formatTime(appt.startTime)}
                      </td>
                      <td className="px-5 py-3 font-medium text-neutral-800 dark:text-neutral-200">
                        {appt.service.name}
                      </td>
                      <td className="px-5 py-3 text-neutral-600 dark:text-neutral-400">
                        {appt.barber.user.name}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={statusVariant[appt.status]}>
                          {statusLabel[appt.status]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-neutral-700 dark:text-neutral-300">
                        {appt.finalPrice ? formatCurrency(appt.finalPrice, currency) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

                        {/* Mobile cards */}
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800 sm:hidden">
              {history.data.map((appt) => (
                <div key={appt.id} className="px-4 py-3">
                  <div className="relative overflow-hidden rounded-xl border border-neutral-200/80 bg-gradient-to-br from-white via-white to-neutral-50 p-3 dark:border-neutral-800 dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-950">
                    <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-indigo-500 via-blue-500 to-cyan-400" />
                    <div className="flex items-start justify-between pl-2">
                      <div>
                        <p className="font-medium text-neutral-800 dark:text-neutral-200">
                          {appt.service.name}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatDate(appt.appointmentDate)} - {formatTime(appt.startTime)}
                        </p>
                        <p className="text-xs text-neutral-400">
                          Barbero: {appt.barber.user.name}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={statusVariant[appt.status]} className="text-xs">
                          {statusLabel[appt.status]}
                        </Badge>
                        <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                          {appt.finalPrice ? formatCurrency(appt.finalPrice, currency) : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {history.pages > 1 && (
              <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3 dark:border-neutral-800">
                <p className="text-xs text-neutral-400">
                  Página {historyPage} de {history.pages}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={historyPage <= 1}
                    onClick={() => changePage(historyPage - 1)}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled={historyPage >= history.pages}
                    onClick={() => changePage(historyPage + 1)}
                    className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
            </div>

      {/* Mobile side panel */}
      <div
        className={cn(
          "fixed inset-0 z-[80] sm:hidden transition-opacity duration-300",
          mobilePanelOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <button
          type="button"
          aria-label="Cerrar panel"
          onClick={() => setMobilePanelOpen(false)}
          className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        />

        <aside
          className={cn(
            "absolute left-0 top-0 h-full w-[88vw] max-w-[22rem] overflow-y-auto border-r border-neutral-200 bg-white shadow-2xl transition-transform duration-300 dark:border-neutral-800 dark:bg-neutral-950",
            mobilePanelOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="relative overflow-hidden border-b border-neutral-200 px-4 pb-4 pt-6 dark:border-neutral-800">
            <div className="bg-orb-blue-emerald pointer-events-none absolute inset-0" />
            <div className="relative flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-lg font-bold text-white dark:bg-white dark:text-neutral-900">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">
                    {customer.name}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300">
                    <Sparkles className="h-3 w-3 text-indigo-500" />
                    Centro de acciones
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobilePanelOpen(false)}
                className="rounded-lg border border-neutral-200 bg-white/80 p-1.5 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="space-y-3 p-4">
            <Button
              className="h-11 w-full justify-start rounded-xl"
              onClick={() => {
                setMobilePanelOpen(false);
                go(router, `/appointments/new?customerId=${customer.id}`);
              }}
            >
              <Calendar className="h-4 w-4" />
              Agendar nueva cita
            </Button>

            {canEdit && (
              <Button
                variant="outline"
                className="h-11 w-full justify-start rounded-xl"
                onClick={() => {
                  setMobilePanelOpen(false);
                  openEdit();
                }}
              >
                <Pencil className="h-4 w-4" />
                Editar perfil
              </Button>
            )}

            {canDelete && (
              <Button
                variant={customer.isActive ? "destructive" : "outline"}
                className="h-11 w-full justify-start rounded-xl"
                onClick={() => {
                  setMobilePanelOpen(false);
                  void toggleActive();
                }}
                disabled={deactivating}
              >
                {deactivating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <UserX className="h-4 w-4" />
                )}
                {customer.isActive ? "Desactivar cliente" : "Reactivar cliente"}
              </Button>
            )}

            <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">
                Resumen rapido
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-neutral-200 bg-white p-2.5 text-center dark:border-neutral-700 dark:bg-neutral-950">
                  <p className="text-[10px] text-neutral-500">Visitas</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {customer.totalVisits}
                  </p>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-2.5 text-center dark:border-neutral-700 dark:bg-neutral-950">
                  <p className="text-[10px] text-neutral-500">Total</p>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                    {formatCurrency(totalSpentNum, currency)}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-neutral-300 p-3 text-xs text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">
              {customer.phone ? (
                <p className="mb-1 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />
                  {customer.phone}
                </p>
              ) : null}
              {customer.email ? (
                <p className="mb-1 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {customer.email}
                </p>
              ) : null}
              {customer.lastVisitAt ? (
                <p className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Ultima visita: {formatDate(customer.lastVisitAt)}
                </p>
              ) : (
                <p>Sin visitas registradas todavia.</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Editar cliente"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              <X className="h-4 w-4" />
              Cancelar
            </Button>
            <Button loading={saving} onClick={() => void submitEdit()}>
              <Save className="h-4 w-4" />
              Guardar cambios
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {editDone && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <p className="text-sm text-emerald-300">Cambios guardados.</p>
            </div>
          )}

          <div>
            <Label htmlFor="e-name">
              Nombre completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="e-name"
              value={editForm.name}
              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="e-phone">Teléfono</Label>
              <Input
                id="e-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="e-email">Email</Label>
              <Input
                id="e-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="e-birth">Fecha de nacimiento</Label>
            <Input
              id="e-birth"
              type="date"
              value={editForm.birthDate}
              onChange={(e) => setEditForm((p) => ({ ...p, birthDate: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="e-notes">Notas internas</Label>
            <Textarea
              id="e-notes"
              rows={3}
              value={editForm.notes}
              onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          {editError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-xs text-red-500">{editError}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

