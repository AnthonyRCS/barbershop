"use client";

import { useEffect, useState } from "react";
import { Plus, ToggleLeft, ToggleRight, Pencil, X, Check, Loader2 } from "lucide-react";
import { createPlatformApi } from "@/lib/platform-api";
import { PlatformPlan } from "@/types/platform";
import {
  PlatformPageHeader,
  PlatformCard,
  EmptyState,
  formatCurrency,
  ConfirmModal,
  PlatformResponsiveModal,
} from "@/components/platform/PlatformShared";
import { cn } from "@/lib/utils";

interface PlanForm {
  name: string;
  price: string;
  maxBarbers: string;
  maxAppointmentsPerMonth: string;
  reports: boolean;
  reminders: boolean;
}

const emptyForm: PlanForm = {
  name: "",
  price: "",
  maxBarbers: "",
  maxAppointmentsPerMonth: "",
  reports: true,
  reminders: true,
};

export function PlansView({ token }: { token: string }) {
  const api = createPlatformApi(token);
  const [plans, setPlans] = useState<PlatformPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toggleConfirm, setToggleConfirm] = useState<PlatformPlan | null>(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  async function load() {
    const data = await api.get<PlatformPlan[]>("/plans");
    setPlans(data);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startEdit(plan: PlatformPlan) {
    const features = plan.features as Record<string, unknown>;
    setEditId(plan.id);
    setForm({
      name: plan.name,
      price: String(plan.price),
      maxBarbers: String(plan.maxBarbers),
      maxAppointmentsPerMonth: String(plan.maxAppointmentsPerMonth),
      reports: typeof features?.reports === "boolean" ? features.reports : true,
      reminders: typeof features?.reminders === "boolean" ? features.reminders : true,
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm);
  }

  async function handleSave() {
    const payload = {
      name: form.name,
      price: parseFloat(form.price),
      maxBarbers: parseInt(form.maxBarbers),
      maxAppointmentsPerMonth: parseInt(form.maxAppointmentsPerMonth),
      features: {
        reports: form.reports,
        reminders: form.reminders,
      },
    };

    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/plans/${editId}`, payload);
      } else {
        await api.post("/plans", { ...payload, active: true });
      }
      await load();
      cancelForm();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle() {
    if (!toggleConfirm) return;
    setToggleLoading(true);
    try {
      await api.patch(`/plans/${toggleConfirm.id}/toggle`, {});
      await load();
    } finally {
      setToggleLoading(false);
      setToggleConfirm(null);
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PlatformPageHeader
        title="Planes"
        description="Administra los planes del SaaS"
        action={
          !showForm ? (
            <button
              onClick={() => {
                setShowForm(true);
                setEditId(null);
                setForm(emptyForm);
              }}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
            >
              <Plus className="h-4 w-4" />
              Nuevo plan
            </button>
          ) : null
        }
      />

      <PlatformResponsiveModal
        open={showForm}
        title={editId ? "Editar plan" : "Crear nuevo plan"}
        onClose={cancelForm}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: "name", label: "Nombre", placeholder: "Plan Pro" },
            { key: "price", label: "Precio (USD/mes)", placeholder: "49.99" },
            { key: "maxBarbers", label: "Max. barberos", placeholder: "10" },
            { key: "maxAppointmentsPerMonth", label: "Max. citas/mes", placeholder: "500" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">{label}</label>
              <input
                value={form[key as keyof Pick<PlanForm, "name" | "price" | "maxBarbers" | "maxAppointmentsPerMonth">]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ))}

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-500 mb-2">Caracteristicas del plan</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, reports: !f.reports }))}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors",
                  form.reports
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-700 bg-zinc-800 text-zinc-300",
                )}
              >
                <span>Reportes</span>
                <span className="text-xs font-semibold">{form.reports ? "ON" : "OFF"}</span>
              </button>

              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, reminders: !f.reminders }))}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-3 py-2 text-sm transition-colors",
                  form.reminders
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-zinc-700 bg-zinc-800 text-zinc-300",
                )}
              >
                <span>Recordatorios</span>
                <span className="text-xs font-semibold">{form.reminders ? "ON" : "OFF"}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5 justify-end">
          <button
            onClick={cancelForm}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
          >
            <X className="h-3.5 w-3.5" /> Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl transition-all flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {editId ? "Guardar cambios" : "Crear plan"}
          </button>
        </div>
      </PlatformResponsiveModal>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-zinc-900 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState message="Sin planes configurados. Crea el primero." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <PlatformCard key={plan.id} className={cn("p-5 transition-all", !plan.active && "opacity-60")}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-base font-bold text-white">{plan.name}</h3>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatCurrency(Number(plan.price))}
                    <span className="text-xs font-normal text-zinc-600">/mes</span>
                  </p>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                    plan.active
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                      : "bg-zinc-500/15 text-zinc-500 border-zinc-500/20",
                  )}
                >
                  {plan.active ? "Activo" : "Inactivo"}
                </span>
              </div>

              <div className="space-y-1 mb-4">
                <p className="text-xs text-zinc-500">
                  Hasta <span className="text-zinc-300">{plan.maxBarbers}</span> barberos
                </p>
                <p className="text-xs text-zinc-500">
                  <span className="text-zinc-300">{plan.maxAppointmentsPerMonth}</span> citas/mes
                </p>
                {plan._count && (
                  <p className="text-xs text-zinc-500">
                    <span className="text-zinc-300">{plan._count.businesses}</span> negocios usando este plan
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
                <button
                  onClick={() => startEdit(plan)}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 py-1.5 rounded-lg transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <button
                  onClick={() => setToggleConfirm(plan)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg transition-colors",
                    plan.active
                      ? "text-orange-400 hover:bg-orange-500/10 bg-zinc-800"
                      : "text-emerald-400 hover:bg-emerald-500/10 bg-zinc-800",
                  )}
                >
                  {plan.active ? (
                    <>
                      <ToggleRight className="h-3.5 w-3.5" /> Desactivar
                    </>
                  ) : (
                    <>
                      <ToggleLeft className="h-3.5 w-3.5" /> Activar
                    </>
                  )}
                </button>
              </div>
            </PlatformCard>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!toggleConfirm}
        title={toggleConfirm?.active ? "Desactivar plan?" : "Activar plan?"}
        message={`El plan "${toggleConfirm?.name}" ${toggleConfirm?.active ? "no estara disponible para nuevos negocios." : "volvera a estar disponible."}`}
        variant={toggleConfirm?.active ? "danger" : "warning"}
        loading={toggleLoading}
        onCancel={() => setToggleConfirm(null)}
        onConfirm={handleToggle}
      />
    </div>
  );
}

