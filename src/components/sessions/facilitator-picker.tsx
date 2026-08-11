"use client";

import * as React from "react";
import { Plus, X } from "lucide-react";
import { Avatar } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Multi-entry with type-ahead over everyone who has facilitated before. */
export function FacilitatorPicker({
  value,
  onChange,
  suggestions,
  id,
}: {
  value: string[];
  onChange: (names: string[]) => void;
  suggestions: string[];
  id?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [focused, setFocused] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const available = React.useMemo(() => {
    const chosen = new Set(value.map((v) => v.toLowerCase()));
    const q = query.trim().toLowerCase();
    return suggestions
      .filter((s) => !chosen.has(s.toLowerCase()))
      .filter((s) => (q ? s.toLowerCase().includes(q) : true))
      .slice(0, 6);
  }, [suggestions, value, query]);

  const add = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setQuery("");
      return;
    }
    onChange([...value, trimmed]);
    setQuery("");
    inputRef.current?.focus();
  };

  const remove = (name: string) =>
    onChange(value.filter((v) => v !== name));

  const canAddTyped =
    query.trim().length > 0 &&
    !suggestions.some((s) => s.toLowerCase() === query.trim().toLowerCase()) &&
    !value.some((v) => v.toLowerCase() === query.trim().toLowerCase());

  return (
    <div>
      {value.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {value.map((name) => (
            <li
              key={name}
              className="flex items-center gap-2 rounded-full bg-white py-1 pr-1 pl-1 ring-1 ring-ink-200 transition-shadow hover:shadow-tile"
            >
              <Avatar name={name} size="sm" />
              <span className="text-[13px] font-medium text-ink-800">{name}</span>
              <button
                type="button"
                onClick={() => remove(name)}
                aria-label={`Remove ${name}`}
                className="rounded-full p-1 text-ink-400 transition-colors hover:bg-ink-100 hover:text-danger-500"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <div
          className={cn(
            "flex h-12 items-center gap-2 rounded-control bg-white px-3.5 ring-1 ring-inset transition-shadow duration-150 sm:h-11",
            focused ? "ring-2 ring-blue-500" : "ring-ink-200 hover:ring-ink-300",
          )}
        >
          <input
            id={id}
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 120)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add(query || available[0] || "");
              } else if (e.key === "Backspace" && !query && value.length > 0) {
                remove(value[value.length - 1]);
              }
            }}
            placeholder="Type a name and press Enter"
            className="w-full bg-transparent text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
          {canAddTyped && (
            <button
              type="button"
              onClick={() => add(query)}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-2xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
            >
              <Plus className="size-3" aria-hidden />
              Add
            </button>
          )}
        </div>

        {focused && available.length > 0 && (
          <div className="animate-rise absolute z-20 mt-1.5 w-full overflow-hidden rounded-tile bg-white py-1 shadow-pop ring-1 ring-ink-200/80">
            {available.map((name) => (
              <button
                key={name}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(name)}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-800 transition-colors hover:bg-blue-50"
              >
                <Avatar name={name} size="sm" />
                {name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
