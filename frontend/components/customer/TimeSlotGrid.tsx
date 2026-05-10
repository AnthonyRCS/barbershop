"use client";

import { cn } from "@/lib/utils";

export interface TimeSlotItem {
  startTime: string;
  endTime: string;
  startLabel: string;
  endLabel: string;
  available: boolean;
  reason?: "PAST" | "OCCUPIED";
}

interface TimeSlotGridProps {
  slots: TimeSlotItem[];
  selectedStartTime: string;
  onSelect: (slot: TimeSlotItem) => void;
}

export function TimeSlotGrid({ slots, selectedStartTime, onSelect }: TimeSlotGridProps) {
  if (slots.length === 0) {
    return <p className="rounded-2xl border border-dashed border-white/10 bg-white/[0.04] px-4 py-5 text-center text-xs text-zinc-500">No hay horarios para este dia.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {slots.map((slot) => {
        const selected = selectedStartTime === slot.startTime;
        const disabled = !slot.available;
        const helper = slot.reason === "OCCUPIED" ? "Ocupado" : slot.reason === "PAST" ? "Ya paso" : "Libre";

        return (
          <button
            key={slot.startTime}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(slot)}
            className={cn(
              "rounded-2xl border px-2.5 py-3 text-center transition-all duration-200",
              selected
                ? "border-primary/60 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : disabled
                ? "border-white/5 bg-white/[0.025] text-zinc-600"
                : "border-white/10 bg-white/[0.055] text-zinc-200 hover:border-primary/40 hover:bg-white/[0.085]"
            )}
          >
            <p className="text-sm font-semibold tracking-tight">{slot.startLabel}</p>
            <p className={cn("text-[11px]", selected ? "text-primary-foreground/75" : "text-zinc-400")}>{slot.endLabel}</p>
            <p
              className={cn(
                "mt-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                slot.reason === "OCCUPIED"
                  ? "text-amber-300"
                  : slot.reason === "PAST"
                  ? "text-zinc-500"
                  : selected
                  ? "text-primary-foreground"
                  : "text-emerald-300"
              )}
            >
              {helper}
            </p>
          </button>
        );
      })}
    </div>
  );
}
