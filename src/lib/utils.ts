import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 1 234 → "1,234". Every number in the UI goes through here. */
export function formatNumber(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("en-GB");
}

/** 0.4213 → "42%" */
export function formatPercent(value: number, digits = 0) {
  if (!Number.isFinite(value)) return "0%";
  return `${(value * 100).toFixed(digits)}%`;
}

/** Share of a total, guarding the divide-by-zero the Excel version can hit. */
export function share(part: number, total: number) {
  return total > 0 ? part / total : 0;
}

/** "NB" for "Ngwa Brenda" — used by the facilitator avatars. */
export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The workbook's ISO-ish week number: `WEEKNUM(date)` counts the week
 * containing 1 January as week 1, with weeks starting on Sunday.
 */
export function excelWeekNumber(date: Date) {
  const year = date.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dayOfYear =
    Math.floor((date.getTime() - jan1.getTime()) / 86_400_000) + 1;
  return Math.ceil((dayOfYear + jan1.getUTCDay()) / 7);
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** The workbook's `TEXT(date,"mmm-yyyy")` — e.g. "Mar-2026". */
export function excelMonthLabel(date: Date) {
  return `${MONTHS_SHORT[date.getUTCMonth()]}-${date.getUTCFullYear()}`;
}

export function monthName(month1to12: number) {
  return MONTHS_LONG[month1to12 - 1] ?? "";
}

export function shortMonthName(month1to12: number) {
  return MONTHS_SHORT[month1to12 - 1] ?? "";
}

/** "14 Mar 2026" */
export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "14 March 2026" — used on the letterhead. */
export function formatLongDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** yyyy-mm-dd, in UTC, for `<input type="date">`. */
export function toDateInputValue(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().slice(0, 10);
}

/** Parses yyyy-mm-dd as a UTC midnight date, avoiding local-timezone drift. */
export function parseDateInput(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function quarterOf(month1to12: number) {
  return Math.floor((month1to12 - 1) / 3) + 1;
}
