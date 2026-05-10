"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  ChevronRight,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Scissors,
  Search,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Badge, Button, Input, Label } from "@/components/ui";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { api, APIError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface BarberUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  photoUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

interface BarberRow {
  id: string;
  userId: string;
  specialty: string | null;
  commissionPercentage: number;
  active: boolean;
  createdAt?: string;
  user: BarberUser;
  _count?: { appointments?: number };
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  photoUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

type FormState = {
  userId: string;
  specialty: string;
  commissionPercentage: number;
  active: boolean;
  photoUrl: string;
};

const EMPTY_FORM: FormState = {
  userId: "",
  specialty: "",
  commissionPercentage: 0,
  active: true,
  photoUrl: "",
};

function formatDate(iso?: string): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/80">
      <p className="text-xs uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold", tone)}>{value}</p>
    </div>
  );
}

export default function BarbersPage() {
  const [rows, setRows] = useState<BarberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<BarberRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [userOptions, setUserOptions] = useState<AvailableUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selected, setSelected] = useState<BarberRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BarberRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const data = await api.get<BarberRow[]>("/api/v1/barbers");
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  async function loadAvailableUsers(search = ""): Promise<void> {
    setLoadingUsers(true);
    try {
      const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      const data = await api.get<AvailableUser[]>(`/api/v1/barbers/available-users${query}`);
      setUserOptions(data);
    } finally {
      setLoadingUsers(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!detailOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDetailOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [detailOpen]);

  useEffect(() => {
    if (!modalOpen || editing) return;
    const id = window.setTimeout(() => {
      void loadAvailableUsers(userSearch);
    }, 280);
    return () => window.clearTimeout(id);
  }, [userSearch, modalOpen, editing]);

  function openCreate(): void {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setUserSearch("");
    void loadAvailableUsers();
    setModalOpen(true);
  }

  function openEdit(row: BarberRow): void {
    setEditing(row);
    setForm({
      userId: row.userId,
      specialty: row.specialty ?? "",
      commissionPercentage: Number(row.commissionPercentage ?? 0),
      active: row.active,
      photoUrl: row.user.photoUrl ?? "",
    });
    setFormError("");
    setUserSearch(`${row.user?.name ?? ""} ${row.user?.email ?? ""}`.trim());
    setModalOpen(true);
  }

  function openDetail(row: BarberRow): void {
    setSelected(row);
    setDetailOpen(true);
  }

  function closeModal(): void {
    setModalOpen(false);
    setForm(EMPTY_FORM);
    setEditing(null);
    setFormError("");
  }

  async function uploadBarberPhoto(file: File): Promise<void> {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/barber-photo", {
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

  async function submit(): Promise<void> {
    if (!editing && !form.userId.trim()) {
      setFormError("El User ID es obligatorio");
      return;
    }

    setSaving(true);
    setFormError("");

    try {
      const payload: {
        userId?: string;
        specialty?: string;
        commissionPercentage: number;
        active: boolean;
        photoUrl?: string;
      } = {
        commissionPercentage: Number(form.commissionPercentage) || 0,
        active: form.active,
      };
      if (!editing) payload.userId = form.userId.trim();

      if (form.specialty.trim()) payload.specialty = form.specialty.trim();
      if (form.photoUrl.trim()) payload.photoUrl = form.photoUrl.trim();

      if (editing) {
        await api.put(`/api/v1/barbers/${editing.id}`, payload);
      } else {
        await api.post("/api/v1/barbers", payload);
      }

      closeModal();
      await load();
    } catch (error: unknown) {
      if (error instanceof APIError) {
        setFormError(error.message);
      } else {
        setFormError("No se pudo guardar el barbero");
      }
    } finally {
      setSaving(false);
    }
  }

  function requestRemove(row: BarberRow): void {
    setDeleteTarget(row);
  }

  async function confirmRemove(): Promise<void> {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/v1/barbers/${deleteTarget.id}`);
      await load();
      if (selected?.id === deleteTarget.id) {
        setSelected(null);
        setDetailOpen(false);
      }
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  function closeDeleteModal(): void {
    if (deleting) return;
    setDeleteTarget(null);
  }

  const selectedUser = useMemo<AvailableUser | null>(() => {
    if (!form.userId) return null;
    const fromOptions = userOptions.find((u) => u.id === form.userId);
    if (fromOptions) return fromOptions;
    if (editing && editing.userId === form.userId) {
      return {
        id: editing.user.id,
        name: editing.user.name,
        email: editing.user.email,
        role: editing.user.role,
        active: editing.user.active,
        photoUrl: editing.user.photoUrl,
        lastLoginAt: editing.user.lastLoginAt,
        createdAt: editing.user.createdAt,
      };
    }
    return null;
  }, [form.userId, userOptions, editing]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();

    return rows.filter((r) => {
      const matchesFilter =
        statusFilter === "all" ||
        (statusFilter === "active" && r.active) ||
        (statusFilter === "inactive" && !r.active);

      if (!matchesFilter) return false;
      if (!query) return true;

      return (
        (r.specialty ?? "").toLowerCase().includes(query) ||
        r.userId.toLowerCase().includes(query) ||
        r.user?.name?.toLowerCase().includes(query) ||
        r.user?.email?.toLowerCase().includes(query)
      );
    });
  }, [rows, search, statusFilter]);

  const stats = useMemo(() => {
    const active = rows.filter((row) => row.active).length;
    return {
      total: rows.length,
      active,
      inactive: rows.length - active,
    };
  }, [rows]);

  const columns = useMemo(
    () => [
      {
        key: "user",
        label: "Barbero",
        sortable: true,
        render: (row: BarberRow) => (
          <div className="flex items-center gap-3">
            {row.user?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.user.photoUrl}
                alt={row.user?.name ?? "Barbero"}
                className="h-9 w-9 rounded-full border border-neutral-200 object-cover dark:border-neutral-700"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-primary dark:bg-indigo-500/20 dark:text-indigo-300">
                {(row.user?.name ?? "B").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium text-neutral-900 dark:text-neutral-100">{row.user?.name ?? "Sin nombre"}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{row.specialty || "Sin especialidad"}</p>
            </div>
          </div>
        ),
      },
      {
        key: "commissionPercentage",
        label: "Comision",
        sortable: true,
        center: true,
        render: (row: BarberRow) => (
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            {Number(row.commissionPercentage ?? 0)}%
          </span>
        ),
      },
      {
        key: "appointments",
        label: "Citas",
        sortable: false,
        center: true,
        render: (row: BarberRow) => <Badge variant="indigo">{row._count?.appointments ?? 0}</Badge>,
      },
      {
        key: "active",
        label: "Estado",
        sortable: true,
        center: true,
        render: (row: BarberRow) =>
          row.active ? <Badge variant="success">Activo</Badge> : <Badge variant="default">Inactivo</Badge>,
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
    <div className="w-full space-y-6 px-4 py-5 sm:px-6 lg:px-8 xl:px-10 animate-fade-in">
      <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-gradient-to-br from-white via-blue-50 to-cyan-50 p-5 dark:border-neutral-800 dark:from-neutral-900 dark:via-neutral-900 dark:to-blue-950/35">
        <div className="bg-orb-blue-emerald pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary/90 dark:text-indigo-300">Equipo</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white">Barberos</h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">Vista rapida lateral y fotos sin salir de la tabla.</p>
          </div>
          <Button onClick={openCreate} className="sm:mt-1">
            <Plus className="h-4 w-4" />
            Nuevo barbero
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total" value={stats.total} tone="text-neutral-900 dark:text-white" />
        <StatCard label="Activos" value={stats.active} tone="text-emerald-600 dark:text-emerald-400" />
        <StatCard label="Inactivos" value={stats.inactive} tone="text-amber-600 dark:text-amber-400" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <Input
            placeholder="Buscar por nombre, especialidad o user id..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
          {filterBtns.map((btn) => (
            <button
              key={btn.value}
              type="button"
              onClick={() => setStatusFilter(btn.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                statusFilter === btn.value
                  ? "bg-primary text-white"
                  : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getKey={(row: BarberRow) => row.id}
        loading={loading}
        lsKey="barbers_table_cols"
        searchTerm={search}
        total={filtered.length}
        pageSize={9999}
        pageSizeOptions={[9999]}
        onRowClick={(row: BarberRow) => openDetail(row)}
        renderActions={(row: BarberRow) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => openDetail(row)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 dark:text-primary dark:hover:bg-primary/10"
            >
              Vista rapida
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => requestRemove(row)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        mobileActions={(row: BarberRow) => [
          {
            label: "Vista rapida",
            icon: <ChevronRight className="h-4 w-4" />,
            onClick: () => openDetail(row),
          },
          {
            label: "Editar",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => openEdit(row),
          },
          {
            label: "Eliminar",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => requestRemove(row),
            danger: true,
          },
        ]}
        emptyState={{
          title: "Sin barberos",
          description: "Agrega el primer barbero a tu equipo.",
          cta: <Scissors className="mx-auto h-5 w-5 text-neutral-400 dark:text-neutral-500" />,
        }}
      />

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
            "absolute left-0 top-0 h-full w-full max-w-md overflow-y-auto border-r border-neutral-200 bg-neutral-950/95 shadow-2xl backdrop-blur-xl transition-transform duration-300 dark:border-neutral-800",
            detailOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="sticky top-0 z-10 border-b border-white/10 bg-neutral-950/95 px-5 py-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Vista rapida</p>
              <button
                type="button"
                onClick={() => setDetailOpen(false)}
                className="rounded-lg border border-neutral-700 p-1.5 text-neutral-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!selected ? (
            <div className="px-5 py-16 text-center text-sm text-neutral-400">Selecciona un barbero para ver detalle.</div>
          ) : (
            <div className="space-y-4 px-5 py-5">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-900 to-cyan-950/30 p-4">
                <div className="bg-orb-blue-emerald pointer-events-none absolute inset-0" />
                <div className="relative flex items-center gap-3">
                  {selected.user?.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.user.photoUrl}
                      alt={selected.user?.name ?? "Barbero"}
                      className="h-14 w-14 rounded-2xl border border-white/20 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/25 text-xl font-bold text-cyan-100">
                      {(selected.user?.name ?? "B").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold text-white">{selected.user?.name ?? "Sin nombre"}</p>
                    <p className="mt-1 text-xs text-cyan-200/90">{selected.specialty || "Sin especialidad"}</p>
                  </div>
                </div>
                <div className="relative mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(selected)}
                    className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => requestRemove(selected)}
                    className="rounded-xl border border-white/15 bg-red-500/20 px-3 py-2 text-sm font-medium text-red-100 hover:bg-red-500/30"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-white/10 bg-neutral-900 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Comision</p>
                  <p className="mt-1 text-lg font-semibold text-white">{Number(selected.commissionPercentage ?? 0)}%</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-neutral-900 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-neutral-500">Estado</p>
                  <p className="mt-1 text-lg font-semibold text-white">{selected.active ? "Activo" : "Inactivo"}</p>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-neutral-900 p-4 text-sm">
                <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-neutral-500">Contacto</p>
                <div className="space-y-1.5 text-neutral-200">
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-neutral-500" />
                    {selected.user?.email ?? "Sin email"}
                  </p>
                  <p className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-neutral-500" />
                    Rol: {selected.user?.role ?? "-"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                    Usuario activo: {selected.user?.active ? "Si" : "No"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                    Ultimo acceso: {formatDateTime(selected.user?.lastLoginAt)}
                  </p>
                  <p className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                    Desde {formatDate(selected.createdAt)} - Citas: {selected._count?.appointments ?? 0}
                  </p>
                  <p className="flex items-center gap-2 text-neutral-400">
                    <span className="font-mono text-[11px]">Barber ID: {selected.id}</span>
                  </p>
                  <p className="flex items-center gap-2 text-neutral-400">
                    <span className="font-mono text-[11px]">User ID: {selected.userId}</span>
                  </p>
                  <p className="flex items-center gap-2 text-cyan-200/80">
                    <Sparkles className="h-3.5 w-3.5" />
                    Sin salir de la tabla
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editing ? "Editar barbero" : "Nuevo barbero"}
        footer={
          <>
            <Button variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={() => void submit()}>
              {editing ? "Guardar cambios" : "Crear barbero"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <ImageUpload
            label="Foto del barbero"
            hint="PNG, JPG o WEBP - max. 5 MB"
            currentUrl={form.photoUrl || undefined}
            uploading={uploadingPhoto}
            onUpload={uploadBarberPhoto}
          />

          <div>
            <Label htmlFor="b-user-search">Usuario del sistema</Label>
            {editing ? (
              <Input
                id="b-user-search"
                value={`${editing.user?.name ?? ""} - ${editing.user?.email ?? ""}`}
                readOnly
              />
            ) : (
              <>
                <Input
                  id="b-user-search"
                  placeholder="Buscar por nombre, correo o ID..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
                <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1.5 dark:border-neutral-800 dark:bg-neutral-900">
                  {loadingUsers ? (
                    <div className="flex items-center gap-2 px-2 py-2 text-xs text-neutral-500">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Buscando usuarios...
                    </div>
                  ) : userOptions.length === 0 ? (
                    <p className="px-2 py-2 text-xs text-neutral-500">No hay usuarios disponibles para asignar.</p>
                  ) : (
                    userOptions.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, userId: user.id }))}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                          form.userId === user.id
                            ? "bg-primary text-white"
                            : "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                        )}
                      >
                        <span className="truncate">{user.name} - {user.email}</span>
                        <span className="ml-2 shrink-0 opacity-80">{user.role}</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
            <input type="hidden" value={form.userId} readOnly />
          </div>

          {selectedUser ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-xs dark:border-neutral-700 dark:bg-neutral-900">
              <p className="font-semibold text-neutral-800 dark:text-neutral-100">{selectedUser.name}</p>
              <p className="mt-0.5 text-neutral-500">{selectedUser.email}</p>
              <p className="mt-1 text-neutral-500">
                Rol: {selectedUser.role} - Estado: {selectedUser.active ? "Activo" : "Inactivo"}
              </p>
              <p className="mt-1 font-mono text-[11px] text-neutral-500">User ID: {selectedUser.id}</p>
            </div>
          ) : null}

          <div>
            <Label htmlFor="b-specialty">Especialidad</Label>
            <Input
              id="b-specialty"
              placeholder="Ej: Fade, Clasico, Disenos"
              value={form.specialty}
              onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="b-commission">Comision (%)</Label>
            <Input
              id="b-commission"
              type="number"
              min={0}
              max={100}
              placeholder="0"
              value={form.commissionPercentage}
              onChange={(e) => setForm((p) => ({ ...p, commissionPercentage: Number(e.target.value) }))}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-primary focus:ring-primary"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Barbero activo</span>
          </label>

          {formError ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-500">
              {formError}
            </div>
          ) : null}
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={closeDeleteModal}
        title="Eliminar barbero"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={closeDeleteModal} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" loading={deleting} onClick={() => void confirmRemove()}>
              Eliminar
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <p className="text-sm text-neutral-200">
            Vas a eliminar a{" "}
            <span className="font-semibold text-white">{deleteTarget?.user?.name ?? "este barbero"}</span>.
          </p>
          <p className="text-xs text-neutral-400">Esta acción oculta el barbero del listado actual.</p>
        </div>
      </Modal>

      {uploadingPhoto && !modalOpen ? (
        <div className="fixed bottom-4 right-4 z-[95] rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Subiendo foto...
          </span>
        </div>
      ) : null}
    </div>
  );
}


