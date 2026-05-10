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
    <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const selected = selectedValue === item.value;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className={cn(
              "min-w-[92px] rounded-2xl border px-3 py-3 text-left transition-all duration-200 sm:min-w-[104px]",
              selected
                ? "border-primary/60 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "border-white/10 bg-white/[0.055] text-zinc-300 hover:border-white/20 hover:bg-white/[0.08]"
            )}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.11em]">{item.label}</p>
            <p className={cn("text-[11px]", selected ? "text-primary-foreground/75" : "text-zinc-400")}>{item.subLabel}</p>
            {item.isToday ? (
              <span
                className={cn(
                  "mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  selected ? "bg-black/15 text-primary-foreground" : "bg-white/10 text-zinc-300"
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
