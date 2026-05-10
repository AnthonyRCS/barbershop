"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { APIError, api } from "@/lib/api";
import { Appointment } from "@/types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui";
import { formatCurrency } from "@/lib/currency";
import { useCurrency } from "@/contexts/CurrencyContext";

const statusVariant: Record<
  Appointment["status"],
  "warning" | "info" | "success" | "error" | "default"
> = {
  PENDING: "warning",
  CONFIRMED: "info",
  COMPLETED: "success",
  CANCELLED: "default",
  NO_SHOW: "error",
};

function toLocalDateTimeInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toUtcDayIsoFromLocalDateTime(localDateTime: string): string {
  const date = new Date(localDateTime);
  const day = new Date(date);
  day.setUTCHours(0, 0, 0, 0);
  return day.toISOString();
}

interface AppointmentTableProps {
  appointments: Appointment[];
  onChanged?: () => void;
}

function getDurationMinutes(appointment: Appointment): number {
  if (appointment.service?.durationMinutes && appointment.service.durationMinutes > 0) {
    return appointment.service.durationMinutes;
  }

  const start = new Date(appointment.startTime).getTime();
  const end = new Date(appointment.endTime).getTime();
  const diff = Math.round((end - start) / 60000);
  return diff > 0 ? diff : 30;
}

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

export function AppointmentTable({ appointments, onChanged }: AppointmentTableProps) {
  const { currency } = useCurrency();
  const [busyId, setBusyId] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDateTime, setRescheduleDateTime] = useState<string>("");

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("Cancelada por barbero");
  const [calledCustomer, setCalledCustomer] = useState<boolean>(false);

  const canManage = useMemo(
    () => new Set<Appointment["status"]>(["PENDING", "CONFIRMED"]),
    []
  );

  const buildSuggestion = (target: Appointment) => {
    const duration = getDurationMinutes(target);
    const sameBarber = appointments
      .filter((item) => item.id !== target.id && item.barberId === target.barberId && item.status !== "CANCELLED")
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    let candidateStart = new Date(target.startTime);
    let candidateEnd = new Date(candidateStart.getTime() + duration * 60 * 1000);

    let moved = false;
    for (let i = 0; i < sameBarber.length; i += 1) {
      const other = sameBarber[i];
      const otherStart = new Date(other.startTime);
      const otherEnd = new Date(other.endTime);
      if (!overlaps(candidateStart, candidateEnd, otherStart, otherEnd)) continue;

      moved = true;
      candidateStart = new Date(otherEnd);
      candidateEnd = new Date(candidateStart.getTime() + duration * 60 * 1000);
      i = -1; // restart scan in case we collide with another block
    }

    return {
      moved,
      duration,
      start: candidateStart,
      end: candidateEnd,
    };
  };

  const parseError = (err: unknown): string => {
    if (err instanceof APIError) return err.message;
    return "No se pudo actualizar la cita";
  };

  const refresh = () => {
    onChanged?.();
  };

  const confirmAppointment = async (appointment: Appointment) => {
    const suggested = buildSuggestion(appointment);
    const originalStart = new Date(appointment.startTime).getTime();
    if (suggested.moved && suggested.start.getTime() !== originalStart) {
      setError("Esta cita choca con otra del mismo barbero. Usa Reprogramar y aplica la hora sugerida.");
      return;
    }

    setBusyId(appointment.id);
    setError("");
    try {
      await api.patch(`/api/v1/appointments/${appointment.id}`, { status: "CONFIRMED" });
      refresh();
    } catch (err) {
      setError(parseError(err));
    } finally {
      setBusyId("");
    }
  };

  const submitReschedule = async () => {
    if (!rescheduleTarget || !rescheduleDateTime) return;

    const selected = new Date(rescheduleDateTime);
    if (Number.isNaN(selected.getTime())) {
      setError("Fecha/hora invalida");
      return;
    }

    setBusyId(rescheduleTarget.id);
    setError("");
    try {
      await api.patch(`/api/v1/appointments/${rescheduleTarget.id}`, {
        startTime: selected.toISOString(),
        appointmentDate: toUtcDayIsoFromLocalDateTime(rescheduleDateTime),
        status: "CONFIRMED",
      });
      setRescheduleTarget(null);
      setRescheduleDateTime("");
      refresh();
    } catch (err) {
      setError(parseError(err));
    } finally {
      setBusyId("");
    }
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;

    setBusyId(cancelTarget.id);
    setError("");
    try {
      await api.patch(`/api/v1/appointments/${cancelTarget.id}`, {
        status: "CANCELLED",
        cancelReason: cancelReason.trim() || "Cancelada por barbero",
      });
      setCancelTarget(null);
      setCancelReason("Cancelada por barbero");
      setCalledCustomer(false);
      refresh();
    } catch (err) {
      setError(parseError(err));
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-zinc-800 bg-zinc-900/80">
          <tr className="text-zinc-400">
            <th className="px-4 py-3 font-medium">Fecha</th>
            <th className="px-4 py-3 font-medium">Hora</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Barbero</th>
            <th className="px-4 py-3 font-medium">Servicio</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 font-medium">Acciones</th>
            <th className="px-4 py-3 font-medium text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
            <tr key={appointment.id} className="border-b border-zinc-800/80 text-zinc-200">
              <td className="px-4 py-3">{format(new Date(appointment.appointmentDate), "yyyy-MM-dd")}</td>
              <td className="px-4 py-3 font-mono text-xs">
                {format(new Date(appointment.startTime), "HH:mm")} - {format(new Date(appointment.endTime), "HH:mm")}
              </td>
              <td className="px-4 py-3">{appointment.customer?.name ?? appointment.customerId}</td>
              <td className="px-4 py-3">{appointment.barber?.user?.name ?? appointment.barberId}</td>
              <td className="px-4 py-3">{appointment.service?.name ?? appointment.serviceId}</td>
              <td className="px-4 py-3">
                <Badge variant={statusVariant[appointment.status]}>{appointment.status}</Badge>
              </td>
              <td className="px-4 py-3">
                {canManage.has(appointment.status) ? (
                  <div className="flex flex-wrap gap-1.5">
                    {appointment.status === "PENDING" ? (
                      <Button
                        size="sm"
                        onClick={() => void confirmAppointment(appointment)}
                        loading={busyId === appointment.id}
                      >
                        Confirmar
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="subtle"
                      onClick={() => {
                        setRescheduleTarget(appointment);
                        setRescheduleDateTime(toLocalDateTimeInputValue(appointment.startTime));
                        setError("");
                      }}
                      disabled={busyId === appointment.id}
                    >
                      Reprogramar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const suggestion = buildSuggestion(appointment);
                        setRescheduleTarget(appointment);
                        setRescheduleDateTime(toLocalDateTimeInputValue(suggestion.start.toISOString()));
                        setError("");
                      }}
                      disabled={busyId === appointment.id}
                    >
                      Sugerir hora
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setCancelTarget(appointment);
                        setCalledCustomer(false);
                        setCancelReason("Cancelada por barbero");
                        setError("");
                      }}
                      disabled={busyId === appointment.id}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-500">Sin acciones</span>
                )}
                {canManage.has(appointment.status) ? (
                  <p className="mt-1 text-[11px] text-zinc-500">
                    Duracion aprox: {getDurationMinutes(appointment)} min.
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-right font-semibold">{formatCurrency(appointment.finalPrice ?? 0, currency)}</td>
            </tr>
          ))}
          {appointments.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-zinc-500" colSpan={8}>
                No hay citas para este filtro.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      </div>

      <Modal
        isOpen={Boolean(rescheduleTarget)}
        onClose={() => setRescheduleTarget(null)}
        title="Reprogramar cita"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRescheduleTarget(null)}>
              Cerrar
            </Button>
            <Button onClick={() => void submitReschedule()} loading={Boolean(rescheduleTarget && busyId === rescheduleTarget.id)}>
              Guardar horario
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {rescheduleTarget ? (
            <p className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200">
              Sugerido por sistema:{" "}
              {format(buildSuggestion(rescheduleTarget).start, "HH:mm")} - {format(buildSuggestion(rescheduleTarget).end, "HH:mm")}{" "}
              ({buildSuggestion(rescheduleTarget).duration} min aprox)
            </p>
          ) : null}
          <p className="text-sm text-zinc-300">
            Nuevo horario para <strong>{rescheduleTarget?.customer?.name ?? "cliente"}</strong>.
          </p>
          <input
            type="datetime-local"
            value={rescheduleDateTime}
            onChange={(event) => setRescheduleDateTime(event.target.value)}
            className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
          />
          <p className="text-xs text-zinc-500">Al guardar, la cita quedara confirmada con el nuevo horario.</p>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancelar cita"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelTarget(null)}>
              Cerrar
            </Button>
            <Button
              variant="destructive"
              onClick={() => void submitCancel()}
              disabled={Boolean(cancelTarget?.customer?.phone) && !calledCustomer}
              loading={Boolean(cancelTarget && busyId === cancelTarget.id)}
            >
              Confirmar cancelacion
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-zinc-300">
            Antes de cancelar, llama al cliente para avisarle el cambio.
          </p>
          {cancelTarget?.customer?.phone ? (
            <a
              href={`tel:${cancelTarget.customer.phone}`}
              className="inline-flex h-9 items-center rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
            >
              Llamar a {cancelTarget.customer.phone}
            </a>
          ) : (
            <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              Este cliente no tiene telefono registrado.
            </p>
          )}
          {cancelTarget?.customer?.phone ? (
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={calledCustomer}
                onChange={(event) => setCalledCustomer(event.target.checked)}
              />
              Ya llame al cliente
            </label>
          ) : null}
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Motivo</label>
            <input
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              className="h-10 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
