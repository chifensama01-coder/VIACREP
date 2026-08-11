import "server-only";

import { aggregate } from "./aggregate";
import { getOrganization, loadNarrative, describeScope, reportTitleFor } from "./narrative";
import { buildReport, type ReportDocument } from "./report";
import { scopeFromSearchParams, reportSlug, type Scope } from "./scope";
import type { SessionUser } from "./auth";
import type { Aggregate } from "./aggregate";

/**
 * Everything a report needs, resolved once. The preview page, the PDF route,
 * the Word route and the Excel route all call this, so a document can't
 * disagree with the screen it was previewed on.
 */
export async function resolveReport(
  params: Record<string, string | string[] | undefined> | URLSearchParams,
  user: SessionUser,
): Promise<{
  scope: Scope;
  data: Aggregate;
  doc: ReportDocument;
  title: string;
  slug: string;
  origin: "saved" | "carried-forward" | "defaults";
  carriedFrom: string | null;
  status: "DRAFT" | "FINAL" | null;
  filterLabels: string[];
}> {
  const scope = scopeFromSearchParams(params);
  const organization = await getOrganization();

  const [data, narrativeState, filterLabels] = await Promise.all([
    aggregate(scope, user, { withPrevious: false }),
    loadNarrative(scope, organization),
    describeScope(scope),
  ]);

  const title = reportTitleFor(scope, filterLabels);
  const doc = buildReport({
    scope,
    data,
    narrative: narrativeState.narrative,
    organization,
    filterLabels,
  });

  return {
    scope,
    data,
    doc,
    title,
    slug: reportSlug(scope),
    origin: narrativeState.origin,
    carriedFrom: narrativeState.carriedFrom,
    status: narrativeState.status,
    filterLabels,
  };
}
