import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { resolveReport } from "@/lib/resolve-report";
import { getFilterOptions, getDataYears } from "@/lib/aggregate";
import { scopeToSearchParams } from "@/lib/scope";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScopeBar } from "@/components/filters/scope-bar";
import { NarrativeEditor } from "@/components/report/narrative-editor";
import {
  LetterheadDocument,
  LetterheadStyles,
} from "@/components/report/letterhead";
import { formatNumber } from "@/lib/utils";

export const metadata = { title: "Build a report" };

export default async function BuildReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const user = await requireUser();

  const [resolved, options, years] = await Promise.all([
    resolveReport(params, user),
    getFilterOptions(),
    getDataYears(),
  ]);

  const { scope, data, doc, title, origin, carriedFrom, status } = resolved;
  const query = scopeToSearchParams(scope).toString();

  return (
    <>
      <PageHeader
        eyebrow="Report builder"
        title={title}
        description="Statistics are computed from the sessions in scope. The five narrative sections are yours to write — they carry forward from last period."
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Build" }]}
        actions={
          <>
            <Badge tone="blue">
              {formatNumber(data.totals.sessions)} sessions
            </Badge>
            <Badge tone="gold">
              {formatNumber(data.totals.participants)} participants
            </Badge>
          </>
        }
      />

      {!scope.sessionId && (
        <ScopeBar
          scope={scope}
          className="mb-5"
          dimensions={["project", "community", "thematicArea", "activityType"]}
          options={{
            projects: options.projects,
            thematicAreas: options.thematicAreas,
            activityTypes: options.activityTypes,
            ageGroups: options.ageGroups,
            communities: options.communities.map((c) => ({
              id: c.id,
              name: c.name,
              divisionSubdivision: `${c.subdivision.division.name} - ${c.subdivision.name}`,
            })),
            officers: options.users,
            years,
          }}
        />
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] xl:gap-6">
        <div>
          <NarrativeEditor
            query={query}
            title={title}
            exportBase="/api/export"
            origin={origin}
            carriedFrom={carriedFrom}
            status={status}
            initial={{
              objectives: docText(doc, 7),
              methodology: docText(doc, 8),
              lessonsLearnt: docText(doc, 9),
              challenges: docText(doc, 10),
              recommendations: docText(doc, 12),
              preparedBy: doc.signature.preparedBy,
              preparedDesignation: doc.signature.preparedDesignation,
              approvedBy: doc.signature.approvedBy,
              approvedDesignation: doc.signature.approvedDesignation,
            }}
          />
        </div>

        <div className="xl:sticky xl:top-6 xl:self-start">
          <Card className="overflow-hidden">
            <CardHeader
              title="Live preview"
              description="Exactly what the PDF will print, letterhead included."
              action={
                <Link
                  href={`/print/report?${query}`}
                  target="_blank"
                  className="flex items-center gap-1.5 text-[13px] font-medium text-blue-700 transition-colors hover:text-blue-800"
                >
                  Open full page
                  <ExternalLink className="size-3.5" aria-hidden />
                </Link>
              }
            />
            <div className="border-t border-ink-100 bg-ink-100/60 p-3 sm:p-5">
              <div className="scroll-slim max-h-[calc(100vh-16rem)] overflow-auto rounded-[6px] bg-white shadow-lifted">
                <LetterheadStyles />
                <div className="origin-top scale-[0.86] sm:scale-100">
                  <div className="pb-8">
                    <LetterheadDocument doc={doc} />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

/** Pulls the bullet text back out of a built section, for the editor. */
function docText(
  doc: Awaited<ReturnType<typeof resolveReport>>["doc"],
  sectionNumber: number,
) {
  const section = doc.sections.find((s) => s.number === sectionNumber);
  const bullets = section?.blocks.find((b) => b.type === "bullets");
  return bullets && bullets.type === "bullets" ? bullets.items.join("\n") : "";
}
