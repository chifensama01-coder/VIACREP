import "server-only";

import type { Organization } from "@prisma/client";
import { db } from "./db";
import {
  REPORT_KIND_LABELS,
  periodBounds,
  periodLabel,
  previousScope,
  reportKind,
  scopeKey,
  type Scope,
} from "./scope";
import type { NarrativeText } from "./report";

export async function getOrganization(): Promise<Organization> {
  const org = await db.organization.findFirst();
  if (!org) {
    throw new Error(
      "No organisation record — run `npm run db:seed` before using reports.",
    );
  }
  return org;
}

/** The document title a scope produces, e.g. "March 2026 Monthly Narrative Report". */
export function reportTitleFor(scope: Scope, filterLabels: string[]) {
  const kind = reportKind(scope);
  const base = REPORT_KIND_LABELS[kind];
  const period = periodLabel(scope.period);
  const filter = filterLabels.length > 0 ? `${filterLabels.join(" · ")} — ` : "";
  return kind === "activity" ? `${filter}${base}` : `${filter}${period} ${base}`;
}

/**
 * Loads the typed sections for a scope.
 *
 * Nothing saved yet? Fall back to the previous comparable period's text
 * (carry-forward), and only then to the organisation's defaults. Staff always
 * start from last month's words rather than a blank page — and nothing here is
 * generated.
 */
export async function loadNarrative(
  scope: Scope,
  organization: Organization,
): Promise<{
  narrative: NarrativeText;
  origin: "saved" | "carried-forward" | "defaults";
  carriedFrom: string | null;
  savedId: string | null;
  status: "DRAFT" | "FINAL" | null;
}> {
  const key = scopeKey(scope);
  const saved = await db.narrativePeriod.findUnique({ where: { scopeKey: key } });
  if (saved) {
    return {
      narrative: pickText(saved),
      origin: "saved",
      carriedFrom: null,
      savedId: saved.id,
      status: saved.status,
    };
  }

  // Walk back up to a year looking for the most recent narrative on the same
  // filter, so a quarterly report inherits the last quarter, not last month.
  let cursor = previousScope(scope);
  for (let hops = 0; cursor && hops < 12; hops++) {
    const previous = await db.narrativePeriod.findUnique({
      where: { scopeKey: scopeKey(cursor) },
    });
    if (previous) {
      return {
        narrative: pickText(previous),
        origin: "carried-forward",
        carriedFrom: previous.title,
        savedId: null,
        status: null,
      };
    }
    cursor = previousScope(cursor);
  }

  return {
    narrative: {
      objectives: organization.defaultObjectives,
      methodology: organization.defaultMethodology,
      lessonsLearnt: organization.defaultLessonsLearnt,
      challenges: organization.defaultChallenges,
      recommendations: organization.defaultRecommendations,
      preparedBy: null,
      preparedDesignation: null,
      approvedBy: null,
      approvedDesignation: null,
    },
    origin: "defaults",
    carriedFrom: null,
    savedId: null,
    status: null,
  };
}

function pickText(row: {
  objectives: string;
  methodology: string;
  lessonsLearnt: string;
  challenges: string;
  recommendations: string;
  preparedBy: string | null;
  preparedDesignation: string | null;
  approvedBy: string | null;
  approvedDesignation: string | null;
}): NarrativeText {
  return {
    objectives: row.objectives,
    methodology: row.methodology,
    lessonsLearnt: row.lessonsLearnt,
    challenges: row.challenges,
    recommendations: row.recommendations,
    preparedBy: row.preparedBy,
    preparedDesignation: row.preparedDesignation,
    approvedBy: row.approvedBy,
    approvedDesignation: row.approvedDesignation,
  };
}

export async function saveNarrative({
  scope,
  title,
  narrative,
  status,
  userId,
}: {
  scope: Scope;
  title: string;
  narrative: NarrativeText;
  status: "DRAFT" | "FINAL";
  userId: string;
}) {
  const key = scopeKey(scope);
  const { start, end } = periodBounds(scope.period);
  const fallbackStart = start ?? new Date();
  const fallbackEnd = end ?? new Date();

  return db.narrativePeriod.upsert({
    where: { scopeKey: key },
    update: {
      title,
      ...narrative,
      status,
      periodStart: fallbackStart,
      periodEnd: fallbackEnd,
      scope: scope as object,
    },
    create: {
      scopeKey: key,
      scope: scope as object,
      title,
      periodStart: fallbackStart,
      periodEnd: fallbackEnd,
      ...narrative,
      status,
      createdById: userId,
    },
  });
}

/**
 * Human-readable names for whatever a scope filters on — used in the report
 * subtitle and the file name.
 */
export async function describeScope(scope: Scope): Promise<string[]> {
  const labels: string[] = [];

  if (scope.sessionId) {
    const session = await db.session.findUnique({
      where: { id: scope.sessionId },
      include: {
        community: { include: { subdivision: { include: { division: true } } } },
        activityType: true,
      },
    });
    if (session) {
      labels.push(session.community.name);
      if (session.activityType) labels.push(session.activityType.name);
    }
    return labels;
  }

  const [project, community, subdivision, division, thematicArea, activityType] =
    await Promise.all([
      scope.projectId
        ? db.project.findUnique({ where: { id: scope.projectId } })
        : null,
      scope.communityId
        ? db.community.findUnique({ where: { id: scope.communityId } })
        : null,
      scope.subdivisionId
        ? db.subdivision.findUnique({ where: { id: scope.subdivisionId } })
        : null,
      scope.divisionId
        ? db.division.findUnique({ where: { id: scope.divisionId } })
        : null,
      scope.thematicAreaId
        ? db.thematicArea.findUnique({ where: { id: scope.thematicAreaId } })
        : null,
      scope.activityTypeId
        ? db.activityType.findUnique({ where: { id: scope.activityTypeId } })
        : null,
    ]);

  if (project) labels.push(project.name);
  if (community) labels.push(community.name);
  if (subdivision) labels.push(subdivision.name);
  if (division) labels.push(`${division.name} Division`);
  if (thematicArea) labels.push(thematicArea.name);
  if (activityType) labels.push(activityType.name);
  return labels;
}
