"use client";

import { cn } from "@/lib/utils";

export interface DateChipItem {
  value: string;
  label: string;
  subLabel: string;
  isToday?: boolean;
}

interface DateChipsProps {
  items: DateChipItem[];
  selectedValue: string;
  onSelect: (value: string) => void;
}

export function DateChips({ items, selectedValue, onSelect }: DateChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const selected = selectedValue === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className={cn(
              "min-w-[94px] rounded-2xl border px-3 py-2.5 text-left transition-all duration-200",
              selected
                ? "border-cyan-300/70 bg-gradient-to-br from-cyan-500/25 via-sky-500/20 to-blue-500/20 text-cyan-100 shadow-lg"
                : "border-zinc-700/80 bg-zinc-900/80 text-zinc-300 hover:border-zinc-500 hover:bg-zinc-800/80"
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.11em]">{item.label}</p>
            <p className={cn("text-[11px]", selected ? "text-cyan-100/80" : "text-zinc-400")}>{item.subLabel}</p>
            {item.isToday ? (
              <span
                className={cn(
                  "mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  selected ? "bg-cyan-200/20 text-cyan-100" : "bg-zinc-700/70 text-zinc-300"
                )}
              >
                Hoy
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
