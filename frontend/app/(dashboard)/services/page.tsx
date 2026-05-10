"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import DataTable from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Badge, Button, Input, Label } from "@/components/ui";
import { api } from "@/lib/api";
import { formatCurrency, getCurrencyMeta } from "@/lib/currency";
import { useCurrency } from "@/contexts/CurrencyContext";

interface ServiceRow {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: string;
  active: boolean;
}

type FormState = {
  name: string;
  description: string;
  durationMinutes: number;
  price: number;
  active: boolean;
};
const EMPTY_FORM: FormState = { name: "", description: "", durationMinutes: 30, price: 0, active: true };

export default function ServicesPage() {
  const { currency } = useCurrency();
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function load(): Promise<void> {
    setLoading(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const data = await api.get<ServiceRow[]>(`/api/v1/services${query}`);
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [search]);

  function openCreate(): void {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(row: ServiceRow): void {
    setEditing(row);
    setForm({
      name: row.name,
      description: row.description ?? "",
      durationMinutes: row.durationMinutes,
      price: Number(row.price),
      active: row.active,
    });
    setModalOpen(true);
  }

  async function submit(): Promise<void> {
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/v1/services/${editing.id}`, form);
      } else {
        await api.post("/api/v1/services", form);
      }
      setModalOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: ServiceRow): Promise<void> {
    if (!window.confirm(`¿Eliminar el servicio "${row.name}"?`)) return;
    await api.delete(`/api/v1/services/${row.id}`);
    await load();
  }

  const filtered = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: "Servicio",
        sortable: true,
        render: (row: ServiceRow) => (
          <div>
            <p className="font-medium text-neutral-900 dark:text-neutral-100">{row.name}</p>
            {row.description ? <p className="text-xs text-neutral-500 dark:text-neutral-400">{row.description}</p> : null}
          </div>
        ),
      },
      {
        key: "durationMinutes",
        label: "Duracion",
        sortable: true,
        center: true,
        render: (row: ServiceRow) => (
          <div className="flex items-center justify-center gap-1.5 text-neutral-600 dark:text-neutral-400">
            <Clock className="h-3.5 w-3.5 text-neutral-500 dark:text-neutral-500" />
            {row.durationMinutes} min
          </div>
        ),
      },
      {
        key: "price",
        label: "Precio",
        sortable: true,
        center: true,
        render: (row: ServiceRow) => (
          <div className="flex items-center justify-center font-semibold text-emerald-400">
            {formatCurrency(row.price, currency)}
          </div>
        ),
      },
      {
        key: "active",
        label: "Estado",
        sortable: true,
        center: true,
        render: (row: ServiceRow) =>
          row.active ? <Badge variant="success">Activo</Badge> : <Badge variant="error">Inactivo</Badge>,
      },
    ],
    [currency],
  );

  return (
    <div className="w-full space-y-6 px-4 py-5 sm:px-6 lg:px-8 xl:px-10 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Servicios</h1>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{rows.length} servicios disponibles</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo servicio
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
        <Input
          placeholder="Buscar servicio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        getKey={(row: ServiceRow) => row.id}
        loading={loading}
        lsKey="services_table_cols"
        searchTerm={search}
        total={filtered.length}
        pageSize={9999}
        pageSizeOptions={[9999]}
        renderActions={(row: ServiceRow) => (
          <>
            <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => void remove(row)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
        mobileActions={(row: ServiceRow) => [
          {
            label: "Editar",
            icon: <Pencil className="h-4 w-4" />,
            onClick: () => openEdit(row),
          },
          {
            label: "Eliminar",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: () => void remove(row),
            danger: true,
          },
        ]}
        emptyState={{
          title: "Sin servicios",
          description: "Crea tu primer servicio para asignarlo a las citas.",
          cta: <Sparkles className="mx-auto h-5 w-5 text-neutral-400 dark:text-neutral-500" />,
        }}
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar servicio" : "Nuevo servicio"}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={() => void submit()}>
              {editing ? "Guardar cambios" : "Crear servicio"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label htmlFor="s-name">Nombre del servicio</Label>
            <Input
              id="s-name"
              placeholder="Ej: Corte clasico"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="s-desc">Descripcion</Label>
            <Input
              id="s-desc"
              placeholder="Descripcion breve (opcional)"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="s-duration">Duracion (minutos)</Label>
              <Input
                id="s-duration"
                type="number"
                min={5}
                step={5}
                placeholder="30"
                value={form.durationMinutes}
                onChange={(e) => setForm((p) => ({ ...p, durationMinutes: Number(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="s-price">Precio ({getCurrencyMeta(currency).symbol})</Label>
              <Input
                id="s-price"
                type="number"
                min={0}
                step={0.5}
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) }))}
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
              className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-primary focus:ring-primary"
            />
            <span className="text-sm text-neutral-700 dark:text-neutral-300">Servicio activo</span>
          </label>
        </div>
      </Modal>
    </div>
  );
}
