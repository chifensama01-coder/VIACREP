import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarRange,
  CalendarDays,
  FileText,
  FolderKanban,
  MapPin,
  Sparkles,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getFilterOptions } from "@/lib/aggregate";
import { quarterOf, formatDate, formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  await requireUser();

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthQuery = `period=month&year=${lastMonth.getFullYear()}&month=${lastMonth.getMonth() + 1}`;
  const thisQuarterQuery = `period=quarter&year=${now.getFullYear()}&quarter=${quarterOf(now.getMonth() + 1)}`;

  const [options, narratives, recentSessions] = await Promise.all([
    getFilterOptions(),
    db.narrativePeriod.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { createdBy: { select: { name: true } } },
    }),
    db.session.findMany({
      orderBy: { date: "desc" },
      take: 5,
      include: {
        community: { select: { name: true } },
        activityType: { select: { name: true } },
      },
    }),
  ]);

  const starters = [
    {
      href: `/reports/build?${lastMonthQuery}`,
      icon: CalendarDays,
      title: "Monthly report",
      description: `${lastMonth.toLocaleDateString("en-GB", { month: "long", year: "numeric" })} — the anchor report`,
      tone: "blue" as const,
    },
    {
      href: `/reports/build?${thisQuarterQuery}`,
      icon: CalendarRange,
      title: "Quarterly report",
      description: `Q${quarterOf(now.getMonth() + 1)} ${now.getFullYear()} — the same sections, a wider window`,
      tone: "gold" as const,
    },
    {
      href: `/reports/build?${lastMonthQuery}&projectId=${options.projects[0]?.id ?? ""}`,
      icon: FolderKanban,
      title: "Project report",
      description: "One programme across the period",
      tone: "blue" as const,
    },
    {
      href: `/reports/build?${lastMonthQuery}&communityId=${options.communities[0]?.id ?? ""}`,
      icon: MapPin,
      title: "Community report",
      description: "One community or area",
      tone: "gold" as const,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Documents"
        title="Reports"
        description="Every report is the same twelve sections: computed statistics plus the narrative you type, merged onto the VIAC letterhead."
        actions={
          <LinkButton href={`/reports/build?${lastMonthQuery}`}>
            <FileText className="size-4" aria-hidden />
            Build a report
          </LinkButton>
        }
      />

      <section className="mb-6">
        <h2 className="mb-3 text-2xs font-semibold tracking-[0.12em] text-ink-400 uppercase">
          Start from
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {starters.map((s) => (
            <Link
              key={s.title}
              href={s.href}
              className="group rounded-card bg-surface p-5 shadow-card ring-1 ring-ink-100/70 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lifted"
            >
              <span
                className={
                  s.tone === "blue"
                    ? "flex size-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition-colors group-hover:bg-blue-100"
                    : "flex size-9 items-center justify-center rounded-lg bg-gold-50 text-gold-700 transition-colors group-hover:bg-gold-100"
                }
              >
                <s.icon className="size-[18px]" aria-hidden />
              </span>
              <p className="mt-3.5 flex items-center gap-1.5 text-[15px] font-semibold text-ink-900">
                {s.title}
                <ArrowRight
                  className="size-3.5 -translate-x-1 text-ink-300 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                  aria-hidden
                />
              </p>
              <p className="mt-1 text-[13px] leading-5 text-ink-500">
                {s.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-5 lg:gap-6">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Saved narratives"
            description="The typed half of each report. New periods start from the most recent one."
          />
          {narratives.length === 0 ? (
            <EmptyState
              compact
              icon={Sparkles}
              title="No narratives written yet"
              description="Build your first report and the words you type will carry forward to the next period."
              action={
                <LinkButton href={`/reports/build?${lastMonthQuery}`} size="sm">
                  Build a report
                </LinkButton>
              }
            />
          ) : (
            <ul className="divide-y divide-ink-100">
              {narratives.map((n) => {
                const scope = n.scope as Record<string, unknown>;
                const query = new URLSearchParams(
                  Object.entries(flattenScope(scope)).filter(
                    ([, v]) => v !== undefined && v !== null,
                  ) as [string, string][],
                ).toString();
                return (
                  <li key={n.id}>
                    <Link
                      href={`/reports/build?${query}`}
                      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-blue-50/40 sm:px-6"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                        <FileText className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-900">
                          {n.title}
                        </span>
                        <span className="block truncate text-2xs text-ink-500">
                          {n.createdBy.name} · updated{" "}
                          {formatDate(n.updatedAt)}
                        </span>
                      </span>
                      <Badge tone={n.status === "FINAL" ? "success" : "neutral"}>
                        {n.status === "FINAL" ? "Final" : "Draft"}
                      </Badge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Single field activity"
            description="One event, its own short report."
          />
          <CardBody className="pt-0">
            {recentSessions.length === 0 ? (
              <p className="py-6 text-center text-[13px] text-ink-400">
                No sessions logged yet.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {recentSessions.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/reports/build?sessionId=${s.id}`}
                      className="group flex items-center gap-3 rounded-tile px-2.5 py-2 transition-colors hover:bg-blue-50/60"
                    >
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gold-50 text-gold-700">
                        <Building2 className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink-900">
                          {s.community.name}
                        </span>
                        <span className="block truncate text-2xs text-ink-500">
                          {formatDate(s.date)}
                          {s.activityType ? ` · ${s.activityType.name}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-[13px] font-semibold text-ink-700 tabular">
                        {formatNumber(s.totalParticipants)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

/** Turns a stored scope JSON back into flat query params. */
function flattenScope(scope: Record<string, unknown>) {
  const period = scope.period as Record<string, unknown> | undefined;
  const out: Record<string, string | undefined> = {};
  if (period) {
    out.period = String(period.kind);
    if (period.year !== undefined) out.year = String(period.year);
    if (period.month !== undefined) out.month = String(period.month);
    if (period.quarter !== undefined) out.quarter = String(period.quarter);
    if (period.from !== undefined) out.from = String(period.from);
    if (period.to !== undefined) out.to = String(period.to);
  }
  for (const key of [
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
  ]) {
    if (scope[key]) out[key] = String(scope[key]);
  }
  return out;
}
