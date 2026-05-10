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
    return <p className="text-xs text-zinc-500">No hay horarios para este dia.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
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
              "rounded-2xl border px-2.5 py-2.5 text-center transition-all duration-200",
              selected
                ? "border-cyan-300 bg-gradient-to-br from-cyan-500/25 via-sky-500/20 to-blue-500/20 text-cyan-100 shadow-lg"
                : disabled
                ? "border-zinc-800 bg-zinc-900/80 text-zinc-500"
                : "border-zinc-700 bg-zinc-900/90 text-zinc-200 hover:border-cyan-400/70 hover:bg-zinc-800/85"
            )}
          >
            <p className="text-sm font-semibold tracking-tight">{slot.startLabel}</p>
            <p className={cn("text-[11px]", selected ? "text-cyan-100/80" : "text-zinc-400")}>{slot.endLabel}</p>
            <p
              className={cn(
                "mt-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                slot.reason === "OCCUPIED"
                  ? "text-amber-300"
                  : slot.reason === "PAST"
                  ? "text-zinc-500"
                  : selected
                  ? "text-cyan-100"
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
