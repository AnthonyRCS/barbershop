"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const go = (router: ReturnType<typeof useRouter>, path: string) => router.push(path as any);
import { useSession } from "next-auth/react";
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Loader2,
  Mail,
  Search,
  Sparkles,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  X,
  Phone,
} from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Badge, Button, Input, Label, Textarea } from "@/components/ui";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { api, APIError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { useCurrency } from "@/contexts/CurrencyContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerRow {
  id: string;
  name: string;
  photoUrl: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  totalVisits: number;
  totalSpent: string;
  lastVisitAt: string | null;
  isActive: boolean;
  createdAt: string;
  preferredBarber: { id: string; user: { name: string } } | null;
  accountLink: { id: string; linkedAt: string } | null;
}

interface CustomerListResponse {
  data: CustomerRow[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

interface DuplicateMatch {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  totalVisits: number;
}

interface FormState {
  name: string;
  photoUrl: string;
  phone: string;
  email: string;
  notes: string;
  birthDate: string;
  createPortalAccess: boolean;
}

interface CustomerDetail extends CustomerRow {
  createdBy?: { id: string; name: string } | null;
}

interface AppointmentHistoryItem {
  id: string;
  appointmentDate: string;
  startTime: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  finalPrice: string | null;
  service: { id: string; name: string; durationMinutes: number };
  barber: { id: string; user: { id: string; name: string } };
}

interface HistoryResponse {
  data: AppointmentHistoryItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const EMPTY_FORM: FormState = {
  name: "",
  photoUrl: "",
  phone: "",
  email: "",
  notes: "",
  birthDate: "",
  createPortalAccess: false,
};

// Roles that can edit/update customers
const CAN_EDIT_ROLES = ["OWNER", "ADMIN", "RECEPTIONIST"];
// Roles that can delete customers
const CAN_DELETE_ROLES = ["OWNER", "ADMIN"];

const statusLabel: Record<AppointmentHistoryItem["status"], string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No asistio",
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
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", color)}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className="text-lg font-bold text-neutral-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

// ─── Duplicate Warning ────────────────────────────────────────────────────────

function DuplicateWarning({
  matches,
  onSelectExisting,
}: {
  matches: DuplicateMatch[];
  onSelectExisting: (id: string) => void;
}) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="mb-2 flex items-center gap-1.5">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          Posible duplicado encontrado
        </p>
      </div>
      <div className="space-y-1.5">
        {matches.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between rounded-md bg-white/60 px-2 py-1.5 dark:bg-neutral-900/60"
          >
            <div>
              <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200">{m.name}</p>
              <p className="text-xs text-neutral-500">
                {[m.phone, m.email].filter(Boolean).join(" · ")} · {m.totalVisits} visitas
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectExisting(m.id)}
              className="ml-2 text-xs font-medium text-primary hover:text-indigo-500 dark:text-primary"
            >
              Ver perfil →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { currency } = useCurrency();
  const role = session?.user?.role ?? "";

  const canEdit = CAN_EDIT_ROLES.includes(role);
  const canDelete = CAN_DELETE_ROLES.includes(role);

  // ── List state ───────────────────────────────────────────────────────────────
  const [response, setResponse] = useState<CustomerListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [lookingUp, setLookingUp] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const lookupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detail panel state (no navigation)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailHistory, setDetailHistory] = useState<HistoryResponse | null>(null);
  const [detailHistoryLoading, setDetailHistoryLoading] = useState(false);

  // ── Load ─────────────────────────────────────────────────────────────────────

  async function load(s = search, active = filterActive): Promise<void> {
    setLoading(true);
    try {
      const buildQuery = (includeSearch: boolean, includeActive: boolean) => {
        const params = new URLSearchParams();
        if (includeSearch && s) params.set("search", s);
        if (includeActive && active !== "all") {
          params.set("isActive", active === "active" ? "true" : "false");
        }
        const query = params.toString();
        return query ? `/api/v1/customers?${query}` : "/api/v1/customers";
      };

      const attempts = [
        buildQuery(true, true),
        buildQuery(true, false),
        buildQuery(false, false),
      ];

      let loaded: CustomerListResponse | null = null;
      let lastError: unknown = null;

      for (const endpoint of attempts) {
        try {
          loaded = await api.get<CustomerListResponse>(endpoint);
          break;
        } catch (err) {
          lastError = err;
          if (!(err instanceof APIError) || err.statusCode !== 422) {
            throw err;
          }
        }
      }

      if (!loaded && lastError) {
        throw lastError;
      }

      if (loaded) {
        setResponse(loaded);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  function handleSearch(val: string) {
    setSearch(val);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => void load(val, filterActive), 350);
  }

  function handleFilterChange(val: "all" | "active" | "inactive") {
    setFilterActive(val);
    void load(search, val);
  }

  // ── Duplicate lookup ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!modalOpen) return;
    if (!form.phone && !form.email) {
      setDuplicates([]);
      return;
    }
    if (lookupTimeout.current) clearTimeout(lookupTimeout.current);
    lookupTimeout.current = setTimeout(async () => {
      if (!form.phone && !form.email) return;
      setLookingUp(true);
      try {
        const body: { phone?: string; email?: string } = {};
        if (form.phone) body.phone = form.phone;
        if (form.email) body.email = form.email;
        const matches = await api.post<DuplicateMatch[]>("/api/v1/customers/lookup", body);
        setDuplicates(matches);
      } catch {
        setDuplicates([]);
      } finally {
        setLookingUp(false);
      }
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.phone, form.email, modalOpen]);

  // ── Modal helpers ────────────────────────────────────────────────────────────

  function openCreate(): void {
    setForm(EMPTY_FORM);
    setFormError("");
    setDuplicates([]);
    setModalOpen(true);
  }

  function closeModal(): void {
    setModalOpen(false);
    setForm(EMPTY_FORM);
    setFormError("");
    setDuplicates([]);
  }

  async function submit(): Promise<void> {
    setFormError("");
    setSaving(true);
    try {
      const body: Record<string, string | undefined> = { name: form.name };
      if (form.photoUrl) body.photoUrl = form.photoUrl;
      if (form.phone) body.phone = form.phone;
      if (form.email) body.email = form.email;
      if (form.notes) body.notes = form.notes;
      if (form.birthDate) body.birthDate = new Date(form.birthDate).toISOString();

      const createdCustomer = await api.post<CustomerRow>("/api/v1/customers", body);
      if (form.createPortalAccess && form.email) {
        await api.post("/api/v1/customers/invite-portal", {
          customerId: createdCustomer.id,
          email: form.email,
        });
      }
      closeModal();
      await load();
    } catch (err: unknown) {
      const e = err as { message?: string; code?: string };
      if (e?.code === "CUSTOMER_DUPLICATE") {
        setFormError(e.message ?? "Duplicado detectado");
      } else {
        setFormError(e?.message ?? "Error al crear el cliente");
      }
    } finally {
      setSaving(false);
    }
  }

  async function uploadCustomerPhoto(file: File): Promise<void> {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/customer-photo", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as {
        photoUrl?: string;
        error?: { message?: string };
      };

      if (!response.ok || !payload.photoUrl) {
        throw new Error(payload.error?.message ?? "No se pudo subir la foto");
      }

      setForm((prev) => ({ ...prev, photoUrl: payload.photoUrl ?? "" }));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function openDetailPanel(customerId: string): Promise<void> {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailHistoryLoading(true);

    try {
      const [detailResult, historyResult] = await Promise.allSettled([
        api.get<CustomerDetail>(`/api/v1/customers/${customerId}`),
        api.get<HistoryResponse>(`/api/v1/customers/${customerId}/history?page=1&limit=6`),
      ]);

      if (detailResult.status === "fulfilled") {
        setDetail(detailResult.value);
      } else {
        setDetail(null);
      }

      if (historyResult.status === "fulfilled") {
        setDetailHistory(historyResult.value);
      } else {
        setDetailHistory({ data: [], total: 0, page: 1, limit: 6, pages: 0 });
      }
    } catch {
      setDetail(null);
      setDetailHistory(null);
    } finally {
      setDetailLoading(false);
      setDetailHistoryLoading(false);
    }
  }

  useEffect(() => {
    if (!detailOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDetailOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [detailOpen]);

  // ── Stats ────────────────────────────────────────────────────────────────────

  const rows = response?.data ?? [];
  const total = response?.total ?? 0;

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.isActive).length;
    const thisMonth = rows.filter((r) => {
      if (!r.createdAt) return false;
      const d = new Date(r.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { active, thisMonth };
  }, [rows]);

  // ── Table columns ─────────────────────────────────────────────────────────────

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Cliente",
        sortable: true,
        render: (row: CustomerRow) => (
          <div className="flex items-center gap-2.5">
            {row.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.photoUrl}
                alt={row.name}
                className="h-8 w-8 shrink-0 rounded-full border border-neutral-200 object-cover dark:border-neutral-700"
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-primary dark:bg-indigo-500/20 dark:text-primary">
                {row.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{row.name}</p>
              {row.email ? (
                <p className="text-xs text-neutral-400 dark:text-neutral-500">{row.email}</p>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        key: "phone",
        label: "Teléfono",
        sortable: false,
        render: (row: CustomerRow) => (
          <span className="text-sm text-neutral-600 dark:text-neutral-400">
            {row.phone ?? "—"}
          </span>
        ),
      },
      {
        key: "totalVisits",
        label: "Visitas",
        sortable: true,
        center: true,
        render: (row: CustomerRow) => (
          <Badge variant="indigo">{row.totalVisits}</Badge>
        ),
      },
      {
        key: "lastVisitAt",
        label: "Última visita",
        sortable: true,
        render: (row: CustomerRow) =>
          row.lastVisitAt ? (
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {new Date(row.lastVisitAt).toLocaleDateString("es", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </span>
          ) : (
            <span className="text-sm text-neutral-400">Sin visitas</span>
          ),
      },
      {
        key: "isActive",
        label: "Estado",
        sortable: false,
        center: true,
        render: (row: CustomerRow) =>
          row.isActive ? (
            <Badge variant="success">Activo</Badge>
          ) : (
            <Badge variant="default">Inactivo</Badge>
          ),
      },
    ],
    [],
  );

  const filterBtns: { value: "all" | "active" | "inactive"; label: string }[] = [
    { value: "all", label: "Todos" },
    { value: "active", label: "Activos" },
    { value: "inactive", label: "Inactivos" },
  ];

  return (
    <div className="w-full space-y-5 px-4 py-5 sm:px-6 lg:px-8 xl:px-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {total} clientes registrados
          </p>
        </div>
        <Button onClick={openCreate}>
          <UserPlus className="h-4 w-4" />
          Nuevo cliente
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total"
          value={total}
          icon={<Users className="h-4 w-4 text-primary" />}
          color="bg-indigo-50 dark:bg-indigo-500/10"
        />
        <StatCard
          label="Activos"
          value={stats.active}
          icon={<UserCheck className="h-4 w-4 text-emerald-600" />}
          color="bg-emerald-50 dark:bg-emerald-500/10"
        />
        <StatCard
          label="Nuevos este mes"
          value={stats.thisMonth}
          icon={<TrendingUp className="h-4 w-4 text-amber-600" />}
          color="bg-amber-50 dark:bg-amber-500/10"
        />
      </div>

      {/* Search + filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Buscar por nombre, teléfono o email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {filterBtns.map((btn) => (
            <button
              key={btn.value}
              type="button"
              onClick={() => handleFilterChange(btn.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                filterActive === btn.value
                  ? "bg-primary text-white"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={rows}
        getKey={(row: CustomerRow) => row.id}
        loading={loading}
        lsKey="customers_table_cols"
        searchTerm={search}
        total={rows.length}
        pageSize={9999}
        pageSizeOptions={[9999]}
        onRowClick={(row: CustomerRow) => void openDetailPanel(row.id)}
        renderActions={(row: CustomerRow) => (
          <button
            type="button"
            onClick={() => void openDetailPanel(row.id)}
            className="flex items-center gap-1 text-xs font-medium text-primary hover:text-indigo-500 dark:text-primary"
          >
            Ver rapido <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
        mobileActions={(row: CustomerRow) => [
          {
            label: "Ver rapido",
            icon: <ChevronRight className="h-4 w-4" />,
            onClick: () => void openDetailPanel(row.id),
          },
          {
            label: "Abrir pagina completa",
            icon: <ChevronRight className="h-4 w-4" />,
            onClick: () => go(router, `/customers/${row.id}`),
          },
        ]}
        emptyState={{
          title: "Sin clientes",
          description: search
            ? "No se encontraron clientes con esa búsqueda."
            : "Agrega tu primer cliente para comenzar.",
        }}
      />

      {/* Inline customer detail drawer */}
      <div
        className={cn(
          "fixed inset-0 z-[90] transition-opacity duration-300",
          detailOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <button
          type="button"
          aria-label="Cerrar detalle"
          className="absolute inset-0 bg-black/45"
          onClick={() => setDetailOpen(false)}
        />

        <aside
          className={cn(
            "absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-neutral-200 bg-neutral-950/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 dark:border-neutral-800",
            detailOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/95 px-5 py-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Cliente
              </p>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="rounded-lg border border-neutral-700 p-1.5 text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : !detail ? (
            <div className="px-5 py-16 text-center text-sm text-neutral-400">
              No pudimos cargar el detalle del cliente.
            </div>
          ) : (
            <div className="space-y-5 px-5 py-5">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-900 to-indigo-950/30 p-4">
                <div className="bg-orb-blue-emerald pointer-events-none absolute inset-0" />
                <div className="relative flex items-center gap-3">
                  {detail.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={detail.photoUrl}
                      alt={detail.name}
                      className="h-14 w-14 rounded-2xl border border-white/20 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/25 text-xl font-bold text-indigo-200">
                      {detail.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-white">{detail.name}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-indigo-200/90">
                      <Sparkles className="h-3 w-3" />
                      Vista rapida sin salir de la tabla
                    </p>
                  </div>
                </div>
                <div className="relative mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => go(router, `/appointments/new?customerId=${detail.id}`)}
                    className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
                  >
                    Agendar cita
                  </button>
                  <button
                    type="button"
                    onClick={() => go(router, `/customers/${detail.id}`)}
                    className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-white/10"
                  >
                    Abrir pagina
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-white/10 bg-neutral-900 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Visitas</p>
                  <p className="mt-1 text-lg font-semibold text-white">{detail.totalVisits}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-neutral-900 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Total</p>
                  <p className="mt-1 text-lg font-semibold text-white">{formatCurrency(detail.totalSpent, currency)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-neutral-900 p-4 text-sm">
                <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-neutral-500">
                  Contacto
                </p>
                <div className="space-y-1.5 text-neutral-200">
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-neutral-500" />
                    {detail.phone ?? "Sin telefono"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-neutral-500" />
                    {detail.email ?? "Sin email"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                    Cliente desde {formatDate(detail.createdAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-neutral-900">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                  <p className="text-sm font-semibold text-white">Ultimas citas</p>
                  <p className="text-xs text-neutral-500">{detailHistory?.total ?? 0} citas</p>
                </div>
                {detailHistoryLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
                  </div>
                ) : !detailHistory || detailHistory.data.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-neutral-500">
                    Sin citas registradas aun.
                  </div>
                ) : (
                  <div className="space-y-2 p-3">
                    {detailHistory.data.map((appt) => (
                      <div key={appt.id} className="rounded-lg border border-white/10 bg-neutral-950 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-white">{appt.service.name}</p>
                            <p className="text-xs text-neutral-500">
                              {formatDate(appt.appointmentDate)} - {formatTime(appt.startTime)}
                            </p>
                            <p className="text-xs text-neutral-500">
                              Barbero: {appt.barber.user.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <Badge variant={statusVariant[appt.status]}>{statusLabel[appt.status]}</Badge>
                            <p className="mt-1 text-xs text-neutral-400">
                              {appt.finalPrice ? formatCurrency(appt.finalPrice, currency) : "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Create modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title="Nuevo cliente"
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={() => void submit()}>
              Crear cliente
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="c-name">
              Nombre completo <span className="text-red-500">*</span>
            </Label>
            <Input
              id="c-name"
              placeholder="Juan Pérez"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <ImageUpload
            label="Foto del cliente"
            hint="PNG, JPG o WEBP - max. 5 MB"
            currentUrl={form.photoUrl || undefined}
            uploading={uploadingPhoto}
            onUpload={uploadCustomerPhoto}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="c-phone">
                Teléfono{" "}
                {lookingUp && form.phone ? (
                  <Loader2 className="inline h-3 w-3 animate-spin text-neutral-400" />
                ) : null}
              </Label>
              <Input
                id="c-phone"
                placeholder="+51 999 999 999"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="c-email">Email</Label>
              <Input
                id="c-email"
                type="email"
                placeholder="cliente@email.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="c-birth">
              <Calendar className="mr-1 inline h-3.5 w-3.5 text-neutral-400" />
              Fecha de nacimiento
            </Label>
            <Input
              id="c-birth"
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="c-notes">Notas internas</Label>
            <Textarea
              id="c-notes"
              rows={2}
              placeholder="Preferencias, alergias, observaciones..."
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm dark:border-neutral-800 dark:bg-neutral-900">
            <input
              type="checkbox"
              checked={form.createPortalAccess}
              onChange={(e) => setForm((p) => ({ ...p, createPortalAccess: e.target.checked }))}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <span className="text-neutral-700 dark:text-neutral-300">
              Crear acceso de cliente al portal y enviar invitacion por email
            </span>
          </label>
          {form.createPortalAccess && !form.email ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">Para enviar invitacion, el email es obligatorio.</p>
          ) : null}

          {/* Duplicate warning */}
          {duplicates.length > 0 && (
            <DuplicateWarning
              matches={duplicates}
              onSelectExisting={(id) => {
                closeModal();
                void openDetailPanel(id);
              }}
            />
          )}

          {/* Server error */}
          {formError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-xs text-red-500">{formError}</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

