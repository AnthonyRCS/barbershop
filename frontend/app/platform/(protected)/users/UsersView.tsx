"use client";

import { useEffect, useState } from "react";
import { Plus, X, Check, Loader2, UserCog } from "lucide-react";
import { createPlatformApi } from "@/lib/platform-api";
import { PlatformUser, PlatformRole } from "@/types/platform";
import {
  PlatformPageHeader,
  PlatformCard,
  PlatformUserStatusBadge,
  EmptyState,
  formatDate,
  ConfirmModal,
} from "@/components/platform/PlatformShared";

const ROLES: PlatformRole[] = ["SUPERADMIN", "SUPPORT", "FINANCE", "ANALYST"];

const roleLabels: Record<PlatformRole, string> = {
  SUPERADMIN: "Superadmin",
  SUPPORT: "Soporte",
  FINANCE: "Finanzas",
  ANALYST: "Analista",
};

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: PlatformRole;
}

const emptyForm: UserForm = { name: "", email: "", password: "", role: "ANALYST" };

export function UsersView({
  token,
  currentUserId,
}: {
  token: string;
  currentUserId: string;
}) {
  const api = createPlatformApi(token);
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<PlatformUser | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  async function load() {
    const data = await api.get<PlatformUser[]>("/users");
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate() {
    setFormError(null);
    if (!form.name || !form.email || !form.password) {
      setFormError("Todos los campos son obligatorios");
      return;
    }
    setSaving(true);
    try {
      await api.post("/users", form);
      await load();
      setShowForm(false);
      setForm(emptyForm);
    } catch (e: unknown) {
      setFormError((e as Error).message ?? "Error al crear usuario");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus() {
    if (!statusConfirm) return;
    setStatusLoading(true);
    try {
      const newStatus = statusConfirm.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await api.patch(`/users/${statusConfirm.id}/status`, { status: newStatus });
      await load();
    } finally {
      setStatusLoading(false);
      setStatusConfirm(null);
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <PlatformPageHeader
        title="Usuarios de Plataforma"
        description="Administradores internos del SaaS"
        action={
          !showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
            >
              <Plus className="h-4 w-4" />
              Nuevo usuario
            </button>
          ) : null
        }
      />

      {/* Create Form */}
      {showForm && (
        <PlatformCard className="p-6">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Crear usuario de plataforma</h2>
          {formError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl p-3 mb-4">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: "name", label: "Nombre completo", type: "text", placeholder: "Ana González" },
              { key: "email", label: "Email", type: "email", placeholder: "ana@plataforma.com" },
              { key: "password", label: "Contraseña", type: "password", placeholder: "Mín. 8 caracteres" },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof UserForm]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Rol</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as PlatformRole }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{roleLabels[r]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4 justify-end">
            <button
              onClick={() => { setShowForm(false); setForm(emptyForm); setFormError(null); }}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" /> Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary/90 disabled:opacity-50 text-white rounded-xl transition-all flex items-center gap-1.5"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Crear usuario
            </button>
          </div>
        </PlatformCard>
      )}

      {/* Users Table */}
      <PlatformCard>
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 bg-zinc-800 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <EmptyState message="Sin usuarios de plataforma registrados." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Usuario", "Rol", "Estado", "Último acceso", "Registrado", "Acciones"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-white">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{u.name}</p>
                          <p className="text-xs text-zinc-600">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-lg">
                        {roleLabels[u.role]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <PlatformUserStatusBadge status={u.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-zinc-500">{formatDate(u.lastLoginAt)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-zinc-600">{formatDate(u.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      {u.id !== currentUserId && (
                        <button
                          onClick={() => setStatusConfirm(u)}
                          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <UserCog className="h-3.5 w-3.5" />
                          {u.status === "ACTIVE" ? "Desactivar" : "Activar"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PlatformCard>

      <ConfirmModal
        open={!!statusConfirm}
        title={statusConfirm?.status === "ACTIVE" ? "¿Desactivar usuario?" : "¿Activar usuario?"}
        message={`El usuario "${statusConfirm?.name}" ${statusConfirm?.status === "ACTIVE" ? "perderá acceso al panel" : "recuperará acceso al panel"}.`}
        variant={statusConfirm?.status === "ACTIVE" ? "danger" : "warning"}
        loading={statusLoading}
        onCancel={() => setStatusConfirm(null)}
        onConfirm={handleToggleStatus}
      />
    </div>
  );
}

