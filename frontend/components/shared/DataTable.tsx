import { Skeleton, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T extends object> {
  columns: Column<T>[];
  rows: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  actions?: (row: T) => React.ReactNode;
}

export function DataTable<T extends object>({
  columns,
  rows,
  loading = false,
  emptyTitle = "Sin resultados",
  emptyDescription = "No hay datos para mostrar.",
  emptyIcon,
  actions,
}: DataTableProps<T>) {
  const allColumns = actions
    ? [...columns, { key: "__actions__" as keyof T, label: "", className: "w-24 text-right" }]
    : columns;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-surface/30 backdrop-blur-md shadow-2xl">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-black/20">
              {allColumns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    "px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground",
                    column.className,
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse bg-white/[0.01]">
                  {allColumns.map((col) => (
                    <td key={String(col.key)} className="px-6 py-4">
                      <Skeleton className="h-5 w-full bg-white/5 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={allColumns.length} className="px-6 py-16">
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="group transition-colors hover:bg-white/[0.03] relative"
                >
                  {/* Hover indicator */}
                  <td className="absolute left-0 top-0 bottom-0 w-0.5 bg-gold-500 opacity-0 transition-opacity group-hover:opacity-100" />
                  
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn("px-6 py-4 text-foreground font-medium tracking-wide", column.className)}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key] ?? "")}
                    </td>
                  ))}
                  {actions ? (
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                        {actions(row)}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
