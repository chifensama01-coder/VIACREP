"use client";

import * as React from "react";
import { formatNumber, formatPercent } from "@/lib/utils";

/**
 * Shared chart chrome.
 *
 * The series colours are the set validated with the data-viz palette checker
 * against a white surface: lightness band, chroma floor, protan/deutan/tritan
 * separation and contrast. Gold sits below 3:1 on white by nature, so every
 * chart that uses it also carries value labels or a legend — the relief channel
 * the check requires. Nothing here re-colours by rank: a series keeps its hue
 * when a filter changes the row count.
 */
export const SERIES = {
  primary: "#118AB9", // blue-600
  accent: "#DDA328", // gold-500 (VIAC gold)
  third: "#0F8C77",
  fourth: "#6E56CF",
} as const;

/** One hue, light → dark, for ordered bands like age groups. */
export const ORDINAL_BLUE = ["#81C7F2", "#2FB8F8", "#118AB9", "#116E92", "#13546D"];

export const GRID = "#ECEEF1";
export const AXIS_INK = "#909599";

export const axisProps = {
  tick: { fill: AXIS_INK, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

/** A tooltip that matches the app's cards rather than Recharts' default box. */
export function ChartTooltip({
  active,
  payload,
  label,
  total,
  valueLabel = "participants",
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; payload?: Record<string, unknown> }[];
  label?: string | number;
  total?: number;
  valueLabel?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="pointer-events-none min-w-[160px] rounded-tile bg-ink-900 px-3 py-2.5 shadow-pop">
      {label !== undefined && (
        <p className="mb-1.5 text-2xs font-medium tracking-wide text-ink-300">
          {String(label)}
        </p>
      )}
      <ul className="space-y-1">
        {payload.map((entry, i) => (
          <li key={i} className="flex items-center gap-2 text-[13px]">
            <span
              className="size-2 shrink-0 rounded-[3px]"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="flex-1 text-ink-300">{entry.name ?? valueLabel}</span>
            <span className="font-semibold text-white tabular">
              {formatNumber(entry.value ?? 0)}
            </span>
            {total ? (
              <span className="w-9 text-right text-ink-400 tabular">
                {formatPercent((entry.value ?? 0) / total)}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Identity is never colour-alone: every multi-series chart gets this. */
export function Legend({
  items,
  className,
}: {
  items: { label: string; color: string }[];
  className?: string;
}) {
  return (
    <ul className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className ?? ""}`}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            className="size-2.5 rounded-[3px]"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span className="text-2xs font-medium text-ink-600">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A horizontal ranked bar list.
 *
 * For "which communities did we reach most", a plain bar chart with 20 rotated
 * labels is worse than a list: this keeps the names readable, puts the value
 * where the eye lands, and needs no axis at all.
 */
export function RankedBars({
  rows,
  total,
  color = SERIES.primary,
  max: maxOverride,
  emptyText = "No data in this period",
  metaKey,
}: {
  rows: { id: string; name: string; participants: number; sessions: number; meta?: string }[];
  total: number;
  color?: string;
  max?: number;
  emptyText?: string;
  metaKey?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-[13px] text-ink-400">{emptyText}</p>
    );
  }
  const max = maxOverride ?? Math.max(...rows.map((r) => r.participants), 1);

  return (
    <ol className="space-y-2.5">
      {rows.map((row) => (
        <li key={row.id} className="group">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[13px] font-medium text-ink-800">
              {row.name}
              {metaKey && row.meta && (
                <span className="ml-1.5 font-normal text-ink-400">{row.meta}</span>
              )}
            </span>
            <span className="shrink-0 text-[13px] font-semibold text-ink-900 tabular">
              {formatNumber(row.participants)}
              {total > 0 && (
                <span className="ml-1.5 text-2xs font-normal text-ink-400">
                  {formatPercent(row.participants / total)}
                </span>
              )}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                width: `${Math.max((row.participants / max) * 100, 2)}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}
