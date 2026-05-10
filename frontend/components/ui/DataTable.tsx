// @ts-nocheck
"use client";

/**
 * DataTable — generic, schema-driven table component
 *
 * Extracts all shared infrastructure from ProgramacionViajesTable /
 * FleetAvailabilityTable into a single reusable primitive:
 *
 *  - Column visibility toggle + drag-to-reorder  (DraggableList)
 *  - Per-column Excel-like checkbox filter        (ColumnFilterMenu)
 *  - Client-side sort with animated sort icons
 *  - Sticky "Acciones" column (right)
 *  - Checkbox selection + bulk-actions bar
 *  - Custom horizontal scrollbar (thumb drag)
 *  - Pagination footer with page-size selector
 *  - Skeleton loading (initial load) + progress bar (refresh)
 *  - Scroll-position preservation during refetch
 *  - localStorage persistence for column preferences
 *  - Empty state with optional CTA
 *  - Mobile kebab menu for actions
 *
 * ── Props ──────────────────────────────────────────────────────────────────
 *
 *  columns          Array<ColDef>   Column definitions (see ColDef below)
 *  data             Array<object>   Row data
 *  getKey           (row) => string Unique key extractor
 *  getFilterValue   (row, colKey) => string
 *                                   String extractor used by ColumnFilterMenu
 *  loading          boolean         true while fetching
 *  page             number          Current page (1-indexed)
 *  setPage          fn(page)
 *  pageSize         number
 *  setPageSize      fn(size)
 *  total            number          Total row count (for pagination)
 *  selectable       boolean         Show checkboxes + bulk-actions bar
 *  bulkActions      ReactNode       Rendered inside bulk-actions bar when rows are selected
 *                                   Receives { selectedKeys: Set, selectedRows: [], clearSelection: fn }
 *  lsKey            string          localStorage key for column prefs
 *  defaultVisibleKeys  string[]
 *  groupLabels      { [group]: string }
 *  groupColors      { [group]: string }  Tailwind className string
 *  renderActions    (row, { isMobile }) => ReactNode
 *                                   Sticky actions column content per row
 *  mobileActions    (row) => Array<{ label, icon, onClick, danger? }>
 *                                   Items for the mobile kebab menu
 *  emptyState       { title, description, cta? }
 *  searchTerm       string          If set, shown in empty-state message
 *  toolbar          ReactNode       Rendered to the right of the count/filter bar
 *  onRowClick         (row) => void   Row click handler
 *  pageSizeOptions    number[]        Defaults to [25, 50, 100, 200]
 *  renderExpandedRow  (row) => ReactNode
 *                                     If provided, each row gets an expand toggle.
 *                                     When toggled, a full-width <tr> is inserted
 *                                     below the row rendering the returned node.
 *
 * ── ColDef ─────────────────────────────────────────────────────────────────
 *  key       string      Unique column identifier
 *  label     string      Header text
 *  group?    string      Group key (used for color badges in column panel)
 *  fixed?    boolean     Cannot be hidden
 *  sortable? boolean     Clickable sort header
 *  center?   boolean     text-center on both header and cell
 *  minWidth? string      min-w-[…] Tailwind class for td
 *  render    (row, rowIndex, page, pageSize) => ReactNode
 */

import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  Search,
  Columns3,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  ChevronDown,
  MoreVertical,
  X,
} from "lucide-react";
import DraggableList from "@/components/ui/DraggableList";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadColPrefs(lsKey) {
  if (typeof window === "undefined") return null;
  try {
    const s = JSON.parse(localStorage.getItem(lsKey) || "{}");
    const order = Array.isArray(s.order) && s.order.length ? s.order : null;
    const visible =
      Array.isArray(s.visible) && s.visible.length ? s.visible : null;
    return { order, visible };
  } catch {
    return null;
  }
}

function saveColPrefs(lsKey, visible, order) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      lsKey,
      JSON.stringify({ visible: [...visible], order })
    );
  } catch {}
}

// ─── ColumnFilterMenu ─────────────────────────────────────────────────────────

function ColumnFilterMenu({ col, items, filterState, setFilterState, getFilterValue }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const uniqueValues = useMemo(() => {
    const vals = new Set();
    items.forEach((it) => {
      const v = getFilterValue(it, col.key) || "(Vacío)";
      vals.add(v);
    });
    return Array.from(vals).sort();
  }, [items, col.key, getFilterValue]);

  const selected = filterState || new Set(uniqueValues);
  const filteredValues = search
    ? uniqueValues.filter((v) => v.toLowerCase().includes(search.toLowerCase()))
    : uniqueValues;

  const allFilteredSelected = filteredValues.every((v) => selected.has(v));

  const toggleAll = () => {
    if (allFilteredSelected) {
      const next = new Set([...selected].filter((v) => !filteredValues.includes(v)));
      setFilterState(next.size === uniqueValues.length ? null : next.size > 0 ? next : null);
    } else {
      const next = new Set([...selected, ...filteredValues]);
      setFilterState(next.size === uniqueValues.length ? null : next);
    }
  };

  const toggleValue = (val) => {
    const curr = filterState ? new Set(filterState) : new Set(uniqueValues);
    curr.has(val) ? curr.delete(val) : curr.add(val);
    setFilterState(
      curr.size === uniqueValues.length ? null : curr.size > 0 ? curr : null
    );
  };

  const isFiltered = filterState !== null && filterState !== undefined && filterState.size < uniqueValues.length;

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!e.target.closest(`[data-dtfmenu="${col.key}"]`)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, col.key]);

  return (
    <div className="relative inline-flex" data-dtfmenu={col.key}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        className={`p-0.5 rounded transition-all duration-150 ${
          isFiltered
            ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/20"
            : "text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 dark:hover:text-neutral-300 group-hover:opacity-100 opacity-40"
        }`}
        title={isFiltered ? "Filtro activo — click para editar" : "Filtrar columna"}
      >
        <Filter className="w-3 h-3" />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 w-52 overflow-hidden rounded-xl
            bg-white dark:bg-neutral-700
            border border-black/[.08] dark:border-white/[.1]
            shadow-lg"
        >
          {/* search */}
          <div className="px-2 py-1.5 border-b border-black/[.06] dark:border-white/[.08]">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                autoFocus
                className="w-full pl-6 pr-2 py-1 text-xs rounded
                  bg-neutral-50 dark:bg-neutral-800
                  border border-black/[.07] dark:border-white/[.08]
                  outline-none focus:border-primary
                  text-neutral-700 dark:text-neutral-200 placeholder:text-neutral-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* select all */}
          <div className="px-2 py-1 border-b border-black/[.06] dark:border-white/[.08]">
            <label className="flex items-center gap-2 cursor-pointer py-0.5 select-none">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleAll}
                className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-neutral-500 text-blue-600"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                {search ? "Sel. visibles" : "Seleccionar todo"}
              </span>
            </label>
          </div>

          {/* value list */}
          <div className="max-h-44 overflow-y-auto py-1">
            {filteredValues.map((val) => (
              <label
                key={val}
                className="flex items-center gap-2 px-2 py-1 cursor-pointer
                  hover:bg-neutral-50 dark:hover:bg-neutral-600/60 select-none"
              >
                <input
                  type="checkbox"
                  checked={selected.has(val)}
                  onChange={() => toggleValue(val)}
                  className="w-3.5 h-3.5 rounded border-neutral-300 dark:border-neutral-500 text-blue-600 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />
                <span className="text-xs text-neutral-700 dark:text-neutral-200 truncate">
                  {val}
                </span>
              </label>
            ))}
            {filteredValues.length === 0 && (
              <p className="px-3 py-3 text-xs text-neutral-400 dark:text-neutral-500 text-center">
                Sin coincidencias
              </p>
            )}
          </div>

          {/* clear */}
          {isFiltered && (
            <div className="border-t border-black/[.06] dark:border-white/[.08] px-2 py-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFilterState(null);
                  setOpen(false);
                }}
                className="w-full text-xs font-medium text-blue-600 dark:text-blue-400
                  hover:text-blue-700 dark:hover:text-blue-300 text-left transition-colors"
              >
                Limpiar filtro
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton({ cols, selectable, hasActions }) {
  const rows = 7;
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-t border-neutral-100 dark:border-neutral-800">
          {selectable && (
            <td className="px-3 py-3 w-10">
              <div className="w-3.5 h-3.5 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </td>
          )}
          {cols.map((col) => (
            <td key={col.key} className="px-2 py-3">
              <div
                className="h-3.5 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse"
                style={{ width: `${50 + ((col.key.charCodeAt(0) * 7) % 50)}%` }}
              />
            </td>
          ))}
          {hasActions && (
            <td className="px-2 py-3 sticky right-0">
              <div className="w-16 h-6 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse ml-auto" />
            </td>
          )}
        </tr>
      ))}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DataTable(props: any) {
  const {
    columns = [],
    data = [],
    getKey,
    getFilterValue,
    loading = false,
    page = 1,
    setPage = () => {},
    pageSize = 25,
    setPageSize = () => {},
    total,
    selectable = false,
    bulkActions = null,
    lsKey = "datatable.cols",
    defaultVisibleKeys = null,
    groupLabels = {},
    groupColors = {},
    renderActions = null,
    mobileActions = null,
    emptyState = { title: "Sin registros", description: "No hay datos para mostrar" },
    searchTerm = "",
    toolbar = null,
    onRowClick = null,
    pageSizeOptions = [25, 50, 100, 200],
    renderExpandedRow = null,
    onColChange = null,
  } = props;
  // ── Derived defaults ────────────────────────────────────────────────────────
  const defaultKeys = defaultVisibleKeys ?? columns.map((c) => c.key);
  const defaultOrder = columns.map((c) => c.key);
  const totalCount = typeof total === "number" ? total : data.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  // ── Column prefs (localStorage) ─────────────────────────────────────────────
  const [colOrder, setColOrder] = useState(() => {
    const prefs = loadColPrefs(lsKey);
    if (prefs?.order) {
      const known = new Set(prefs.order);
      const extras = defaultOrder.filter((k) => !known.has(k));
      return [...prefs.order.filter((k) => defaultOrder.includes(k)), ...extras];
    }
    return defaultOrder;
  });

  const [visibleCols, setVisibleCols] = useState(() => {
    const prefs = loadColPrefs(lsKey);
    return prefs?.visible ? new Set(prefs.visible) : new Set(defaultKeys);
  });

  const [showColMenu, setShowColMenu] = useState(false);

  const toggleCol = useCallback(
    (key) => {
      const col = columns.find((c) => c.key === key);
      if (col?.fixed) return;
      setVisibleCols((prev) => {
        const next = new Set(prev);
        next.has(key) ? next.delete(key) : next.add(key);
        saveColPrefs(lsKey, next, colOrder);
        return next;
      });
    },
    [colOrder, lsKey, columns]
  );

  const handleColReorder = useCallback(
    (newItems) => {
      const newOrder = newItems.map((i) => i.id);
      setColOrder(newOrder);
      saveColPrefs(lsKey, visibleCols, newOrder);
    },
    [visibleCols, lsKey]
  );

  const resetCols = useCallback(() => {
    setColOrder(defaultOrder);
    setVisibleCols(new Set(defaultKeys));
    if (typeof window !== "undefined") localStorage.removeItem(lsKey);
  }, [lsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sort ────────────────────────────────────────────────────────────────────
  const [sortConfig, setSortConfig] = useState({ key: null, dir: null });

  const handleSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.dir === "asc") return { key, dir: "desc" };
        if (prev.dir === "desc") return { key: null, dir: null };
      }
      return { key, dir: "asc" };
    });
  }, []);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const av = a[sortConfig.key] ?? "";
      const bv = b[sortConfig.key] ?? "";
      if (av < bv) return sortConfig.dir === "asc" ? -1 : 1;
      if (av > bv) return sortConfig.dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  // ── Column filters ───────────────────────────────────────────────────────────
  const [filterState, setFilterState] = useState({});

  const filteredData = useMemo(() => {
    const active = Object.entries(filterState).filter(([, v]) => v !== null);
    if (active.length === 0) return sortedData;
    return sortedData.filter((item) =>
      active.every(([key, allowed]) => {
        const val = (getFilterValue ? getFilterValue(item, key) : String(item[key] ?? "")) || "(Vacío)";
        return allowed.has(val);
      })
    );
  }, [sortedData, filterState, getFilterValue]);

  const activeFilterCount = Object.values(filterState).filter((v) => v !== null).length;

  // ── Selection ────────────────────────────────────────────────────────────────
  const [selected, setSelected] = useState(new Set());
  const visibleKeys = useMemo(() => filteredData.map((r) => getKey(r)), [filteredData, getKey]);
  const allSelected = visibleKeys.length > 0 && visibleKeys.every((k) => selected.has(k));
  const someSelected = visibleKeys.some((k) => selected.has(k));

  const toggleOne = (key) => {
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };
  const toggleAll = () => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (allSelected) visibleKeys.forEach((k) => n.delete(k));
      else visibleKeys.forEach((k) => n.add(k));
      return n;
    });
  };
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // ── Scroll preservation + custom horizontal scrollbar ───────────────────────
  const scrollRef = useRef(null);
  const savedScrollTop = useRef(0);
  const hBarRef = useRef(null);
  const hThumbRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (loading) {
      savedScrollTop.current = el.scrollTop;
    } else {
      const raf = requestAnimationFrame(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = savedScrollTop.current;
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [loading]);

  useEffect(() => {
    const el = scrollRef.current;
    const bar = hBarRef.current;
    const thumb = hThumbRef.current;
    if (!el || !bar || !thumb) return;

    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      if (scrollWidth <= clientWidth) {
        thumb.style.opacity = "0";
        return;
      }
      thumb.style.opacity = "1";
      const ratio = clientWidth / scrollWidth;
      const thumbW = Math.max(48, ratio * bar.clientWidth);
      const maxLeft = bar.clientWidth - thumbW;
      const thumbLeft =
        maxLeft > 0
          ? (scrollLeft / (scrollWidth - clientWidth)) * maxLeft
          : 0;
      thumb.style.width = `${thumbW}px`;
      thumb.style.transform = `translateX(${thumbLeft}px)`;
    };

    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const handleThumbPointerDown = useCallback((e) => {
    e.preventDefault();
    const el = scrollRef.current;
    const bar = hBarRef.current;
    const thumb = hThumbRef.current;
    if (!el || !bar || !thumb) return;
    const startX = e.clientX;
    const startScrollLeft = el.scrollLeft;
    const { scrollWidth, clientWidth } = el;
    const thumbW = thumb.offsetWidth;
    const trackW = bar.clientWidth;
    const onMove = (me) => {
      const delta = me.clientX - startX;
      el.scrollLeft =
        startScrollLeft + (delta / (trackW - thumbW)) * (scrollWidth - clientWidth);
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, []);

  // ── Expanded rows ────────────────────────────────────────────────────────────
  const [expandedKeys, setExpandedKeys] = useState(new Set());
  const toggleExpand = useCallback((key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  // ── Mobile kebab menu ────────────────────────────────────────────────────────
  const [kebab, setKebab] = useState({ open: false, row: null, x: 0, y: 0 });

  // ── Visible columns ──────────────────────────────────────────────────────────
  const visibleColumns = useMemo(
    () =>
      colOrder
        .filter((key) => visibleCols.has(key))
        .map((key) => columns.find((c) => c.key === key))
        .filter(Boolean),
    [colOrder, visibleCols, columns]
  );

  // Notify parent when visible columns / order change (used to sync export)
  useEffect(() => {
    if (!onColChange) return;
    onColChange(visibleColumns.map((c) => ({ key: c.key, label: c.label })));
  }, [visibleColumns]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasActions = !!renderActions;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex-wrap gap-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Bulk selection info */}
          {selectable && someSelected ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold">
                {selected.size}
              </span>
              <span className="text-xs text-neutral-500">
                seleccionado{selected.size !== 1 ? "s" : ""}
              </span>
              {bulkActions &&
                bulkActions({
                  selectedKeys: selected,
                  selectedRows: filteredData.filter((r) => selected.has(getKey(r))),
                  clearSelection,
                })}
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                {activeFilterCount > 0 ? (
                  <>
                    <strong className="text-neutral-700 dark:text-neutral-200">
                      {filteredData.length}
                    </strong>{" "}
                    de {totalCount} registros
                  </>
                ) : (
                  <>
                    <strong className="text-neutral-800 dark:text-neutral-200">
                      {totalCount}
                    </strong>{" "}
                    registros
                  </>
                )}
              </span>
              {activeFilterCount > 0 && (
                <>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <Filter className="w-2.5 h-2.5" />
                    {activeFilterCount} {activeFilterCount === 1 ? "filtro" : "filtros"}
                  </span>
                  <button
                    onClick={() => setFilterState({})}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Limpiar filtros
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {toolbar}

          {/* Column manager */}
          <div className="relative">
            <button
              onClick={() => setShowColMenu((p) => !p)}
              title="Configurar columnas visibles y de exportación"
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                showColMenu
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200 dark:shadow-blue-900/30"
                  : "bg-white hover:bg-blue-50 text-neutral-600 hover:text-blue-700 dark:bg-neutral-800 dark:hover:bg-blue-950/40 dark:text-neutral-300 dark:hover:text-blue-300 border-neutral-200 dark:border-neutral-700"
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Columnas</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${showColMenu ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"}`}>
                {visibleCols.size}
              </span>
            </button>

            {showColMenu && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setShowColMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 z-30 w-72 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl shadow-neutral-200/60 dark:shadow-neutral-950/60 overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
                    <div className="flex items-center gap-2">
                      <Columns3 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200 uppercase tracking-wide">
                        Columnas
                      </span>
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                        tabla + exportación
                      </span>
                    </div>
                    <button
                      onClick={resetCols}
                      title="Restablecer columnas"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Resetear
                    </button>
                  </div>
                  {/* Info hint */}
                  <div className="px-3 py-1.5 bg-blue-50/60 dark:bg-blue-950/20 border-b border-blue-100 dark:border-blue-900/30 flex items-center gap-1.5">
                    <span className="text-[10px] text-blue-600 dark:text-blue-400">
                      Arrastra para reordenar · selecciona para mostrar en tabla y exportar
                    </span>
                  </div>
                  <DraggableList
                    className="py-1 max-h-80 overflow-y-auto"
                    itemClassName="px-3 py-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    items={colOrder
                      .map((key) => columns.find((c) => c.key === key))
                      .filter(Boolean)
                      .map((col) => ({
                        id: col.key,
                        label: col.label,
                        group: col.group,
                        fixed: col.fixed,
                      }))}
                    onChange={handleColReorder}
                    renderItem={(colItem) => (
                      <label className="flex items-center gap-2 cursor-pointer w-full select-none">
                        <input
                          type="checkbox"
                          checked={visibleCols.has(colItem.id)}
                          onChange={() => toggleCol(colItem.id)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={colItem.fixed}
                          className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 cursor-pointer flex-shrink-0 disabled:cursor-not-allowed"
                        />
                        <span className="flex-1 text-xs text-neutral-700 dark:text-neutral-300">
                          {colItem.label}
                          {colItem.fixed && (
                            <span className="ml-1 text-[9px] text-neutral-400">(fija)</span>
                          )}
                        </span>
                        {colItem.group && groupLabels[colItem.group] && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                              groupColors[colItem.group] || "bg-neutral-100 text-neutral-500"
                            }`}
                          >
                            {groupLabels[colItem.group]}
                          </span>
                        )}
                      </label>
                    )}
                  />
                  {/* Footer count */}
                  <div className="px-3 py-2 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-between">
                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
                      <strong className="text-neutral-700 dark:text-neutral-200">{visibleCols.size}</strong> de {columns.length} columnas activas
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-auto relative">
        {/* Progress bar during refetch */}
        {loading && filteredData.length > 0 && (
          <div className="sticky top-0 left-0 right-0 z-20 h-0.5 bg-blue-500/80 animate-pulse pointer-events-none" />
        )}

        {/* Close col menu on outside click */}
        {showColMenu && (
          <div className="fixed inset-0 z-20" onClick={() => setShowColMenu(false)} />
        )}

        <table className="w-full text-sm border-collapse min-w-max">
          <thead className="sticky top-0 z-10">
            <tr className="bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wide border-b border-neutral-200 dark:border-neutral-700">
              {selectable && (
                <th className="px-3 py-3 w-10 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = !allSelected && someSelected;
                    }}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 cursor-pointer"
                  />
                </th>
              )}

              {renderExpandedRow && <th className="px-2 py-3 w-8" />}

              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={`px-3 py-3 text-left whitespace-nowrap group ${
                    col.center ? "text-center" : ""
                  } ${
                    col.sortable
                      ? "cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-700/50 transition-colors"
                      : ""
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 ${
                      col.center ? "justify-center" : ""
                    }`}
                  >
                    {col.sortable ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSort(col.key);
                        }}
                        className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white transition-colors"
                      >
                        {col.label}
                        <span className="opacity-60">
                          {sortConfig.key === col.key ? (
                            sortConfig.dir === "asc" ? (
                              <ArrowUp className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40" />
                          )}
                        </span>
                      </button>
                    ) : (
                      <span>{col.label}</span>
                    )}

                    <ColumnFilterMenu
                      col={col}
                      items={data}
                      filterState={filterState[col.key] ?? null}
                      setFilterState={(newSet) =>
                        setFilterState((prev) => {
                          const next = { ...prev };
                          if (newSet === null) delete next[col.key];
                          else next[col.key] = newSet;
                          return next;
                        })
                      }
                      getFilterValue={
                        getFilterValue ||
                        ((row, key) => String(row[key] ?? ""))
                      }
                    />
                  </div>
                </th>
              ))}

              {hasActions && (
                <th
                  className="px-3 py-3 text-right sticky right-0 z-20
                    bg-neutral-50 dark:bg-neutral-800
                    border-l border-neutral-200 dark:border-neutral-700
                    shadow-lg"
                >
                  Acciones
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {loading && filteredData.length === 0 ? (
              <TableSkeleton cols={visibleColumns} selectable={selectable} hasActions={hasActions} />
            ) : filteredData.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    visibleColumns.length +
                    (selectable ? 1 : 0) +
                    (hasActions ? 1 : 0)
                  }
                >
                  {activeFilterCount > 0 && sortedData.length > 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <Filter className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          {activeFilterCount} filtro{activeFilterCount !== 1 ? "s" : ""} de columna activo{activeFilterCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="text-sm text-neutral-500 dark:text-neutral-400">
                        Ninguna fila coincide.{" "}
                        <button
                          type="button"
                          onClick={() => setFilterState({})}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                        >
                          Limpiar filtros
                        </button>
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-neutral-400 dark:text-neutral-600">
                      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                        {searchTerm
                          ? "Sin resultados para tu búsqueda"
                          : emptyState.title}
                      </p>
                      {!searchTerm && emptyState.description && (
                        <p className="text-xs text-neutral-400">
                          {emptyState.description}
                        </p>
                      )}
                      {!searchTerm && emptyState.cta && emptyState.cta}
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filteredData.map((row, rowIndex) => {
                const key = getKey(row);
                const isSelected = selected.has(key);
                const isExpanded = expandedKeys.has(key);
                const expandContent = renderExpandedRow ? renderExpandedRow(row) : null;
                const hasExpandContent = expandContent != null && expandContent !== false;
                const colSpan =
                  visibleColumns.length +
                  (selectable ? 1 : 0) +
                  (renderExpandedRow ? 1 : 0) +
                  (hasActions ? 1 : 0);
                return (
                  <React.Fragment key={key}>
                    <tr
                      onClick={() => onRowClick?.(row)}
                      className={`border-t border-neutral-100 dark:border-neutral-800 transition-colors ${
                        onRowClick ? "cursor-pointer" : ""
                      } ${
                        isSelected
                          ? "bg-blue-50/60 dark:bg-blue-950/20"
                          : "hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                      }`}
                    >
                      {selectable && (
                        <td className="px-3 py-2.5 w-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleOne(key)}
                            className="h-3.5 w-3.5 cursor-pointer rounded border-neutral-300 text-primary focus:ring-primary"
                          />
                        </td>
                      )}

                      {renderExpandedRow && (
                        <td className="px-2 py-2.5 w-8" onClick={(e) => e.stopPropagation()}>
                          {hasExpandContent ? (
                            <button
                              onClick={() => toggleExpand(key)}
                              className="p-0.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-neutral-500"
                            >
                              {isExpanded
                                ? <ChevronDown className="w-4 h-4" />
                                : <ChevronRightIcon className="w-4 h-4" />}
                            </button>
                          ) : (
                            <span className="w-5 inline-block" />
                          )}
                        </td>
                      )}

                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-3 py-2.5 ${col.minWidth || ""} ${
                            col.center ? "text-center" : ""
                          }`}
                        >
                          {col.render(row, rowIndex, page, pageSize)}
                        </td>
                      ))}

                      {hasActions && (
                        <td
                          className="sticky right-0 bg-white dark:bg-neutral-900 z-10
                            border-l border-black/[.05] dark:border-white/[.06]
                            shadow-md
                            px-2 py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-0.5">
                            {/* Desktop actions */}
                            <div className="hidden sm:flex items-center gap-0.5">
                              {renderActions(row, { isMobile: false })}
                            </div>
                            {/* Mobile kebab */}
                            {mobileActions && (
                              <div className="sm:hidden">
                                <button
                                  title="Acciones"
                                  onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setKebab({
                                      open: true,
                                      row,
                                      x: rect.left,
                                      y: rect.bottom,
                                    });
                                  }}
                                  className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>

                    {hasExpandContent && isExpanded && (
                      <tr className="border-t border-dashed border-neutral-200 dark:border-neutral-700">
                        <td
                          colSpan={colSpan}
                          className="bg-neutral-50/70 dark:bg-neutral-900/60 px-6 py-4"
                        >
                          <div className="border-l-2 border-blue-400/50 dark:border-blue-600/40 pl-4">
                            {expandContent}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Custom horizontal scrollbar ──────────────────────────────────────── */}
      <div
        ref={hBarRef}
        className="h-3 bg-neutral-100 dark:bg-neutral-800/80 relative select-none border-t border-neutral-200 dark:border-neutral-700 cursor-pointer"
        onClick={(e) => {
          const el = scrollRef.current;
          const bar = hBarRef.current;
          if (!el || !bar) return;
          const rect = bar.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          el.scrollLeft = ratio * (el.scrollWidth - el.clientWidth);
        }}
      >
        <div
          ref={hThumbRef}
          onPointerDown={handleThumbPointerDown}
          className="absolute top-0.5 h-2 rounded-full bg-neutral-400/70 dark:bg-neutral-500/70 hover:bg-neutral-500 dark:hover:bg-neutral-400 transition-colors cursor-grab active:cursor-grabbing"
          style={{ opacity: 0, width: "48px" }}
        />
      </div>

      {/* ── Pagination — always visible ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 gap-2 flex-wrap">
        {/* Left: range info + page-size selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Row range: "1–20 de 347 registros" */}
          <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
            {totalCount === 0 ? (
              "0 registros"
            ) : pageSize >= 9000 ? (
              <>{totalCount} registros (todos)</>
            ) : (
              <>
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)}
                </span>
                {" de "}
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  {totalCount}
                </span>
                {" registros"}
              </>
            )}
          </span>

          {/* Page-size selector */}
          <select
            value={pageSize}
            onChange={(e) => {
              const val = Number(e.target.value);
              setPageSize(val);
              setPage(1);
            }}
            className="text-xs px-2 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 cursor-pointer"
          >
            {pageSizeOptions.map((opt) => {
              const isTodos = opt === "todos" || opt >= 9000;
              const val = isTodos ? 9999 : Number(opt);
              const label = isTodos ? "Todos" : `${opt} / pág.`;
              return (
                <option key={val} value={val}>
                  {label}
                </option>
              );
            })}
          </select>
        </div>

        {/* Right: page navigation — hidden when showing all or single page */}
        {totalPages > 1 && pageSize < 9000 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1 || loading}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg =
                totalPages <= 5
                  ? i + 1
                  : page <= 3
                  ? i + 1
                  : page >= totalPages - 2
                  ? totalPages - 4 + i
                  : page - 2 + i;
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  disabled={loading}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    pg === page
                      ? "bg-blue-600 text-white shadow-sm"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                  }`}
                >
                  {pg}
                </button>
              );
            })}

            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages || loading}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* ── Mobile kebab overlay ─────────────────────────────────────────────── */}
      {kebab.open && kebab.row && mobileActions && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setKebab({ open: false, row: null, x: 0, y: 0 })}
          />
          <div
            className="fixed z-50 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 min-w-[140px] animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: Math.min(kebab.y, window.innerHeight - 180),
              left: Math.min(kebab.x - 100, window.innerWidth - 150),
            }}
          >
            {mobileActions(kebab.row).map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  action.onClick(kebab.row);
                  setKebab({ open: false, row: null, x: 0, y: 0 });
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  action.danger
                    ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                    : "text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                }`}
              >
                {action.icon && (
                  <span
                    className={
                      action.danger
                        ? "text-red-500"
                        : "text-neutral-400 dark:text-neutral-400"
                    }
                  >
                    {action.icon}
                  </span>
                )}
                {action.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

