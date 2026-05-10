"use client";

import { useRouter } from "next/navigation";
import { AppointmentForm } from "@/components/appointments/AppointmentForm";

export default function NewAppointmentPage() {
  const router = useRouter();
  return (
    <section className="mx-auto max-w-lg space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Nueva cita</h1>
        <p className="mt-1 text-sm text-neutral-500">Completa los datos para agendar la cita</p>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <AppointmentForm onSuccess={() => router.push("/appointments")} />
      </div>
    </section>
  );
}