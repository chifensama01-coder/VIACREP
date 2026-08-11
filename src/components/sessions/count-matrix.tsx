"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { countKey, sumCounts, type Counts } from "@/lib/counts";

export { countKey, sumCounts, type Counts };

export type KeyPopulationField = {
  id: string;
  name: string;
  shortName: string;
  tracksMale: boolean;
  tracksFemale: boolean;
  maleLabel: string;
  femaleLabel: string;
};

/**
 * The participant matrix, cell for cell with `Data_Entry!I:T`.
 *
 * A population that the sheet only counts one way (AGYW female, AYBM male)
 * shows a dash where the other cell would be, so the form can never record a
 * figure the workbook has no column for.
 */
export function CountMatrix({
  keyPopulations,
  counts,
  onChange,
}: {
  keyPopulations: KeyPopulationField[];
  counts: Counts;
  onChange: (counts: Counts) => void;
}) {
  const set = (key: string, raw: string) => {
    const next = { ...counts };
    const value = raw === "" ? 0 : Math.max(0, Math.floor(Number(raw) || 0));
    if (value === 0) delete next[key];
    else next[key] = value;
    onChange(next);
  };

  const total = sumCounts(counts);
  const male = sumBySex(counts, keyPopulations, "MALE");
  const female = sumBySex(counts, keyPopulations, "FEMALE");

  return (
    <div>
      <div className="overflow-hidden rounded-tile ring-1 ring-ink-200/80">
        {/* Header row — hidden on phones, where each population is its own card */}
        <div className="hidden bg-ink-50 sm:grid sm:grid-cols-[1fr_120px_120px]">
          <div className="px-4 py-2.5 text-2xs font-semibold tracking-[0.1em] text-ink-500 uppercase">
            Key population
          </div>
          <div className="px-4 py-2.5 text-center text-2xs font-semibold tracking-[0.1em] text-ink-500 uppercase">
            Male
          </div>
          <div className="px-4 py-2.5 text-center text-2xs font-semibold tracking-[0.1em] text-ink-500 uppercase">
            Female
          </div>
        </div>

        <div className="divide-y divide-ink-100 bg-white">
          {keyPopulations.map((kp) => {
            const maleKey = countKey(kp.id, "MALE");
            const femaleKey = countKey(kp.id, "FEMALE");
            const rowTotal =
              (counts[maleKey] ?? 0) + (counts[femaleKey] ?? 0);

            return (
              <div
                key={kp.id}
                className={cn(
                  "px-4 py-3 transition-colors sm:grid sm:grid-cols-[1fr_120px_120px] sm:items-center sm:gap-0 sm:px-0 sm:py-0",
                  rowTotal > 0 && "bg-blue-50/40",
                )}
              >
                <div className="flex items-baseline justify-between gap-3 sm:block sm:px-4 sm:py-2.5">
                  <span className="text-sm font-medium text-ink-800">
                    {kp.name}
                  </span>
                  {rowTotal > 0 && (
                    <span className="text-2xs font-semibold text-blue-700 tabular sm:hidden">
                      {formatNumber(rowTotal)}
                    </span>
                  )}
                </div>

                <div className="mt-2 grid grid-cols-2 gap-3 sm:mt-0 sm:contents">
                  <CountCell
                    label={kp.maleLabel}
                    disabled={!kp.tracksMale}
                    value={counts[maleKey]}
                    onChange={(v) => set(maleKey, v)}
                  />
                  <CountCell
                    label={kp.femaleLabel}
                    disabled={!kp.tracksFemale}
                    value={counts[femaleKey]}
                    onChange={(v) => set(femaleKey, v)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live running total — the sheet's TOTAL column, computed as you type */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-tile bg-ink-900 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-white/10 text-blue-300">
            <Users className="size-[18px]" aria-hidden />
          </span>
          <div>
            <p className="text-2xs font-medium tracking-[0.1em] text-ink-400 uppercase">
              Total participants
            </p>
            <p className="text-[13px] text-ink-400">
              <span className="text-blue-300 tabular">{formatNumber(male)}</span>{" "}
              male ·{" "}
              <span className="text-gold-300 tabular">{formatNumber(female)}</span>{" "}
              female
            </p>
          </div>
        </div>
        <p className="text-[34px] leading-none font-semibold tracking-[-0.03em] text-white">
          {formatNumber(total)}
        </p>
      </div>
    </div>
  );
}

function CountCell({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number | undefined;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  if (disabled) {
    return (
      <div className="flex h-12 items-center justify-center rounded-control bg-ink-50/60 text-ink-300 sm:h-auto sm:rounded-none sm:bg-transparent sm:py-2.5">
        <span aria-label="Not tracked for this population">—</span>
      </div>
    );
  }
  return (
    <div className="sm:px-3 sm:py-2">
      <label className="sr-only">{label}</label>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        placeholder="0"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        aria-label={label}
        className={cn(
          "h-12 w-full rounded-control bg-white text-center text-[15px] tabular",
          "ring-1 ring-inset ring-ink-200 transition-shadow duration-150",
          "placeholder:text-ink-300 hover:ring-ink-300",
          "focus:ring-2 focus:ring-blue-500 focus:outline-none sm:h-10",
          value ? "font-semibold text-ink-900" : "text-ink-700",
        )}
      />
      <span className="mt-1 block text-center text-2xs text-ink-400 sm:hidden">
        {label}
      </span>
    </div>
  );
}

function sumBySex(
  counts: Counts,
  keyPopulations: KeyPopulationField[],
  sex: "MALE" | "FEMALE",
) {
  return keyPopulations.reduce(
    (total, kp) => total + (counts[countKey(kp.id, sex)] ?? 0),
    0,
  );
}
