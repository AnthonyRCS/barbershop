import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Clock3 } from "lucide-react";
import { Appointment } from "@/types";
import { AppointmentCard } from "./AppointmentCard";

function getMinutes(start: string, end: string): number {
  const from = new Date(start).getTime();
  const to = new Date(end).getTime();
  return Math.max(0, Math.round((to - from) / 60000));
}

function getHourRange(appointments: Appointment[]): number[] {
  if (appointments.length === 0) {
    return Array.from({ length: 12 }).map((_, index) => index + 9);
  }

  const hours = appointments.map((item) => new Date(item.startTime).getHours());
  const start = Math.max(6, Math.min(...hours) - 1);
  const end = Math.min(22, Math.max(...hours) + 2);

  return Array.from({ length: end - start + 1 }).map((_, index) => start + index);
}

export function AppointmentCalendar({ appointments }: { appointments: Appointment[] }) {
  const sortedAppointments = [...appointments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  const occupiedMinutes = sortedAppointments.reduce(
    (acc, item) => acc + getMinutes(item.startTime, item.endTime),
    0,
  );

  const periods = [
    { key: "morning", label: "Manana", from: 6, to: 11 },
    { key: "afternoon", label: "Tarde", from: 12, to: 17 },
    { key: "evening", label: "Noche", from: 18, to: 23 },
  ] as const;

  const hours = getHourRange(sortedAppointments);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Agenda del dia</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {sortedAppointments.length} citas - {occupiedMinutes} min ocupados
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-200">
            <Clock3 className="mr-1 inline h-3.5 w-3.5" />
            Vista diaria
          </div>
        </div>
      </div>

      <div className="space-y-4 md:hidden">
        {periods.map((period) => {
          const items = sortedAppointments.filter((item) => {
            const hour = new Date(item.startTime).getHours();
            return hour >= period.from && hour <= period.to;
          });

          if (items.length === 0) {
            return null;
          }

          return (
            <section key={period.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  {period.label}
                </h3>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">{items.length} citas</span>
              </div>

              <div className="space-y-2.5">
                {items.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    customerName={appointment.customer?.name ?? appointment.customerId}
                    customerPhone={appointment.customer?.phone}
                    barberName={appointment.barber?.user?.name}
                    serviceName={appointment.service?.name}
                    start={format(new Date(appointment.startTime), "HH:mm", { locale: es })}
                    end={format(new Date(appointment.endTime), "HH:mm", { locale: es })}
                    durationMinutes={getMinutes(appointment.startTime, appointment.endTime)}
                    price={appointment.finalPrice}
                    status={appointment.status}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:block">
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {hours.map((hour) => {
            const label = `${String(hour).padStart(2, "0")}:00`;
            const hourAppointments = sortedAppointments.filter(
              (item) => new Date(item.startTime).getHours() === hour,
            );

            return (
              <div
                key={hour}
                className="grid grid-cols-[78px_1fr] items-start gap-3 px-4 py-3"
              >
                <div className="pt-1 text-xs font-mono font-semibold text-neutral-500 dark:text-neutral-500">
                  {label}
                </div>

                <div className="space-y-2">
                  {hourAppointments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-neutral-200 px-3 py-2 text-xs text-neutral-400 dark:border-neutral-700 dark:text-neutral-500">
                      Sin citas
                    </div>
                  ) : (
                    hourAppointments.map((appointment) => (
                      <AppointmentCard
                        key={appointment.id}
                        customerName={appointment.customer?.name ?? appointment.customerId}
                        customerPhone={appointment.customer?.phone}
                        barberName={appointment.barber?.user?.name}
                        serviceName={appointment.service?.name}
                        start={format(new Date(appointment.startTime), "HH:mm", { locale: es })}
                        end={format(new Date(appointment.endTime), "HH:mm", { locale: es })}
                        durationMinutes={getMinutes(appointment.startTime, appointment.endTime)}
                        price={appointment.finalPrice}
                        status={appointment.status}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
