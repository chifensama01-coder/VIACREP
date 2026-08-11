"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboOption = {
  value: string;
  label: string;
  /** Shown in muted type to the right — e.g. the division/subdivision. */
  meta?: string;
  /** Extra text matched when searching. */
  keywords?: string;
};

/**
 * A searchable single-select. 103 communities in a native <select> is a scroll;
 * this filters as you type and can offer "add a new one" when allowed.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  onCreate,
  createLabel = "Add",
  invalid,
  id,
  disabled,
}: {
  options: ComboOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  onCreate?: (query: string) => void;
  createLabel?: string;
  invalid?: boolean;
  id?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      `${o.label} ${o.meta ?? ""} ${o.keywords ?? ""}`.toLowerCase().includes(q),
    );
  }, [options, query]);

  const exactMatch = filtered.some(
    (o) => o.label.toLowerCase() === query.trim().toLowerCase(),
  );
  const showCreate = Boolean(onCreate) && query.trim().length > 1 && !exactMatch;

  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Focusing the field is a DOM side effect and belongs here; clearing the
  // query is state, and is done by whoever opens the list (see `toggle`).
  React.useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  React.useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const total = filtered.length + (showCreate ? 1 : 0);

  const toggle = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) {
        setQuery("");
        setActive(0);
      }
      return !wasOpen;
    });
  };

  const choose = (index: number) => {
    if (showCreate && index === filtered.length) {
      onCreate?.(query.trim());
      setOpen(false);
      return;
    }
    const option = filtered[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (total === 0 ? 0 : (a + 1) % total));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (total === 0 ? 0 : (a - 1 + total) % total));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "flex h-12 w-full items-center gap-2 rounded-control bg-white px-3.5 text-left",
          "text-[15px] ring-1 ring-inset transition-shadow duration-150 sm:h-11",
          "hover:ring-ink-300 focus:ring-2 focus:ring-blue-500 focus:outline-none",
          invalid ? "ring-danger-500" : "ring-ink-200",
          disabled && "cursor-not-allowed bg-ink-50",
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            <>
              <span className="text-ink-900">{selected.label}</span>
              {selected.meta && (
                <span className="ml-2 text-[13px] text-ink-400">
                  {selected.meta}
                </span>
              )}
            </>
          ) : (
            <span className="text-ink-400">{placeholder}</span>
          )}
        </span>
        {selected && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="-mr-1 rounded p-1 text-ink-300 transition-colors hover:bg-ink-100 hover:text-ink-600"
          >
            <X className="size-3.5" />
          </span>
        )}
        <ChevronsUpDown className="size-4 shrink-0 text-ink-400" aria-hidden />
      </button>

      {open && (
        <div className="animate-rise absolute z-30 mt-1.5 w-full overflow-hidden rounded-tile bg-white shadow-pop ring-1 ring-ink-200/80">
          <div className="flex items-center gap-2 border-b border-ink-100 px-3">
            <Search className="size-4 shrink-0 text-ink-400" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              className="h-11 w-full bg-transparent text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none"
            />
          </div>

          <div
            ref={listRef}
            role="listbox"
            className="scroll-slim max-h-64 overflow-y-auto py-1"
          >
            {filtered.length === 0 && !showCreate && (
              <p className="px-3.5 py-6 text-center text-[13px] text-ink-400">
                {emptyText}
              </p>
            )}

            {filtered.map((option, i) => (
              <button
                key={option.value}
                type="button"
                data-index={i}
                role="option"
                aria-selected={option.value === value}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(i)}
                className={cn(
                  "flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm transition-colors",
                  i === active ? "bg-blue-50" : "hover:bg-ink-50",
                )}
              >
                <span className="min-w-0 flex-1 truncate text-ink-800">
                  {option.label}
                </span>
                {option.meta && (
                  <span className="shrink-0 text-2xs text-ink-400">
                    {option.meta}
                  </span>
                )}
                {option.value === value && (
                  <Check className="size-4 shrink-0 text-blue-600" aria-hidden />
                )}
              </button>
            ))}

            {showCreate && (
              <button
                type="button"
                data-index={filtered.length}
                onMouseEnter={() => setActive(filtered.length)}
                onClick={() => choose(filtered.length)}
                className={cn(
                  "flex w-full items-center gap-2 border-t border-ink-100 px-3.5 py-2.5 text-left text-sm",
                  active === filtered.length ? "bg-gold-50" : "hover:bg-ink-50",
                )}
              >
                <Plus className="size-4 shrink-0 text-gold-600" aria-hidden />
                <span className="truncate text-ink-800">
                  {createLabel} “<span className="font-medium">{query.trim()}</span>”
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
