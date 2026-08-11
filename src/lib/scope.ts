/**
 * A report or a dashboard view is a **period** plus a set of **filters**.
 * Everything downstream — the dashboard tiles, each AUTO section of a report,
 * and the Excel export — is driven by one of these, which is why "monthly",
 * "quarterly", "per project" and "per community" need only one builder.
 */

import { monthName, quarterOf, shortMonthName } from "./utils";

export type Period =
  | { kind: "all" }
  | { kind: "month"; year: number; month: number } // month is 1-12
  | { kind: "quarter"; year: number; quarter: number } // quarter is 1-4
  | { kind: "year"; year: number }
  | { kind: "range"; from: string; to: string }; // yyyy-mm-dd, inclusive

export type Scope = {
  period: Period;
  projectId?: string;
  thematicAreaId?: string;
  activityTypeId?: string;
  ageGroupId?: string;
  communityId?: string;
  subdivisionId?: string;
  divisionId?: string;
  regionId?: string;
  createdById?: string;
  /** Set for a single-field-activity report; overrides everything else. */
  sessionId?: string;
};

export const ALL_TIME: Scope = { period: { kind: "all" } };

/* -------------------------------------------------------------------------- */
/* Period boundaries                                                          */
/* -------------------------------------------------------------------------- */

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));

/** Inclusive [start, end] in UTC, or nulls for an unbounded period. */
export function periodBounds(period: Period): {
  start: Date | null;
  end: Date | null;
} {
  switch (period.kind) {
    case "all":
      return { start: null, end: null };
    case "month":
      return {
        start: utc(period.year, period.month - 1, 1),
        end: utc(period.year, period.month, 0),
      };
    case "quarter": {
      const firstMonth = (period.quarter - 1) * 3;
      return {
        start: utc(period.year, firstMonth, 1),
        end: utc(period.year, firstMonth + 3, 0),
      };
    }
    case "year":
      return { start: utc(period.year, 0, 1), end: utc(period.year, 11, 31) };
    case "range": {
      const [fy, fm, fd] = period.from.split("-").map(Number);
      const [ty, tm, td] = period.to.split("-").map(Number);
      return { start: utc(fy, fm - 1, fd), end: utc(ty, tm - 1, td) };
    }
  }
}

/** "March 2026", "Q2 2026", "All time" — the reporting-period line. */
export function periodLabel(period: Period): string {
  switch (period.kind) {
    case "all":
      return "All time";
    case "month":
      return `${monthName(period.month)} ${period.year}`;
    case "quarter":
      return `Q${period.quarter} ${period.year}`;
    case "year":
      return String(period.year);
    case "range": {
      const { start, end } = periodBounds(period);
      const fmt = (d: Date) =>
        `${d.getUTCDate()} ${shortMonthName(d.getUTCMonth() + 1)} ${d.getUTCFullYear()}`;
      return `${fmt(start!)} – ${fmt(end!)}`;
    }
  }
}

/** A stable string form, used as `NarrativePeriod.scopeKey` and in URLs. */
export function periodKey(period: Period): string {
  switch (period.kind) {
    case "all":
      return "all";
    case "month":
      return `${period.year}-${String(period.month).padStart(2, "0")}`;
    case "quarter":
      return `${period.year}-Q${period.quarter}`;
    case "year":
      return `${period.year}`;
    case "range":
      return `${period.from}..${period.to}`;
  }
}

/**
 * The canonical key for a scope's narrative, e.g. `monthly:2026-03` or
 * `project:<id>:2026-Q2`. Two views of the same period and filter share one
 * set of typed sections.
 */
export function scopeKey(scope: Scope): string {
  if (scope.sessionId) return `activity:${scope.sessionId}`;
  const parts: string[] = [];
  if (scope.projectId) parts.push(`project:${scope.projectId}`);
  if (scope.communityId) parts.push(`community:${scope.communityId}`);
  if (scope.subdivisionId) parts.push(`subdivision:${scope.subdivisionId}`);
  if (scope.divisionId) parts.push(`division:${scope.divisionId}`);
  if (scope.thematicAreaId) parts.push(`thematic:${scope.thematicAreaId}`);
  if (scope.activityTypeId) parts.push(`activity-type:${scope.activityTypeId}`);
  if (scope.ageGroupId) parts.push(`age:${scope.ageGroupId}`);
  const filter = parts.length > 0 ? parts.join("+") : reportKindOf(scope.period);
  return `${filter}:${periodKey(scope.period)}`;
}

function reportKindOf(period: Period) {
  switch (period.kind) {
    case "month":
      return "monthly";
    case "quarter":
      return "quarterly";
    case "year":
      return "annual";
    case "range":
      return "period";
    case "all":
      return "cumulative";
  }
}

/* -------------------------------------------------------------------------- */
/* Carry-forward: which period comes before this one                          */
/* -------------------------------------------------------------------------- */

/**
 * The previous comparable period, so a new report can start from the last one's
 * text (and the dashboard can show a delta). Ranges and "all time" have no
 * natural predecessor.
 */
export function previousPeriod(period: Period): Period | null {
  switch (period.kind) {
    case "month":
      return period.month === 1
        ? { kind: "month", year: period.year - 1, month: 12 }
        : { kind: "month", year: period.year, month: period.month - 1 };
    case "quarter":
      return period.quarter === 1
        ? { kind: "quarter", year: period.year - 1, quarter: 4 }
        : { kind: "quarter", year: period.year, quarter: period.quarter - 1 };
    case "year":
      return { kind: "year", year: period.year - 1 };
    default:
      return null;
  }
}

export function previousScope(scope: Scope): Scope | null {
  const period = previousPeriod(scope.period);
  return period ? { ...scope, period } : null;
}

/* -------------------------------------------------------------------------- */
/* URL round-tripping                                                          */
/* -------------------------------------------------------------------------- */

const FILTER_KEYS = [
  "projectId",
  "thematicAreaId",
  "activityTypeId",
  "ageGroupId",
  "communityId",
  "subdivisionId",
  "divisionId",
  "regionId",
  "createdById",
  "sessionId",
] as const;

export function scopeToSearchParams(scope: Scope): URLSearchParams {
  const params = new URLSearchParams();
  const p = scope.period;
  params.set("period", p.kind);
  if (p.kind === "month") {
    params.set("year", String(p.year));
    params.set("month", String(p.month));
  } else if (p.kind === "quarter") {
    params.set("year", String(p.year));
    params.set("quarter", String(p.quarter));
  } else if (p.kind === "year") {
    params.set("year", String(p.year));
  } else if (p.kind === "range") {
    params.set("from", p.from);
    params.set("to", p.to);
  }
  for (const key of FILTER_KEYS) {
    const value = scope[key];
    if (value) params.set(key, value);
  }
  return params;
}

type ParamsLike =
  | URLSearchParams
  | Record<string, string | string[] | undefined>;

function read(params: ParamsLike, key: string): string | undefined {
  if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export function scopeFromSearchParams(params: ParamsLike): Scope {
  const kind = read(params, "period") ?? "all";
  const now = new Date();
  const year = Number(read(params, "year")) || now.getUTCFullYear();

  let period: Period;
  switch (kind) {
    case "month":
      period = {
        kind: "month",
        year,
        month: clamp(Number(read(params, "month")) || now.getUTCMonth() + 1, 1, 12),
      };
      break;
    case "quarter":
      period = {
        kind: "quarter",
        year,
        quarter: clamp(
          Number(read(params, "quarter")) || quarterOf(now.getUTCMonth() + 1),
          1,
          4,
        ),
      };
      break;
    case "year":
      period = { kind: "year", year };
      break;
    case "range": {
      const from = read(params, "from");
      const to = read(params, "to");
      period =
        from && to ? { kind: "range", from, to } : { kind: "all" };
      break;
    }
    default:
      period = { kind: "all" };
  }

  const scope: Scope = { period };
  for (const key of FILTER_KEYS) {
    const value = read(params, key);
    if (value) scope[key] = value;
  }
  return scope;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

/* -------------------------------------------------------------------------- */
/* Report identity                                                             */
/* -------------------------------------------------------------------------- */

export type ReportKind =
  | "monthly"
  | "quarterly"
  | "annual"
  | "project"
  | "community"
  | "activity"
  | "custom";

export function reportKind(scope: Scope): ReportKind {
  if (scope.sessionId) return "activity";
  if (scope.projectId) return "project";
  if (scope.communityId || scope.subdivisionId || scope.divisionId)
    return "community";
  switch (scope.period.kind) {
    case "month":
      return "monthly";
    case "quarter":
      return "quarterly";
    case "year":
      return "annual";
    default:
      return "custom";
  }
}

export const REPORT_KIND_LABELS: Record<ReportKind, string> = {
  monthly: "Monthly Narrative Report",
  quarterly: "Quarterly Narrative Report",
  annual: "Annual Narrative Report",
  project: "Project Report",
  community: "Community Report",
  activity: "Field Activity Report",
  custom: "Narrative Report",
};

/** The filename stem for a generated document. */
export function reportSlug(scope: Scope) {
  return [
    "VIAC",
    reportKind(scope).replace(/\s+/g, "-"),
    periodKey(scope.period).replace(/\.\./g, "_to_"),
  ]
    .join("_")
    .replace(/[^\w.-]+/g, "-");
}
