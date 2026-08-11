import {
  Download,
  FileSpreadsheet,
  Layers,
  ListFilter,
  Table2,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { aggregate, getDataYears, getFilterOptions } from "@/lib/aggregate";
import {
  periodLabel,
  scopeFromSearchParams,
  scopeToSearchParams,
} from "@/lib/scope";
import { formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScopeBar } from "@/components/filters/scope-bar";

export const metadata = { title: "Data export" };

const SHEETS = [
  {
    name: "Data",
    detail:
      "Every session, column for column with the workbook's Data_Entry sheet — the same headers, the same order, blanks as zero.",
  },
  { name: "Summary", detail: "Key statistics for the selected scope." },
  { name: "By Community", detail: "Sessions, participants and share per community." },
  { name: "By Thematic Area", detail: "What the sessions covered." },
  { name: "By Project", detail: "SPS, VIAC Program, HVF, MAMA, WHW." },
  { name: "By Age Group", detail: "Adolescents, youth, adults." },
  { name: "By Activity Type", detail: "How the sessions were run." },
  { name: "Key Populations", detail: "The count matrix, split by sex." },
  { name: "Monthly Totals", detail: "The trend, month by month." },
];

export default async function DataExportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scope = scopeFromSearchParams(params);
  const user = await requireUser();

  const [data, options, years] = await Promise.all([
    aggregate(scope, user, { withPrevious: false }),
    getFilterOptions(),
    getDataYears(),
  ]);

  const query = scopeToSearchParams(scope).toString();

  return (
    <>
      <PageHeader
        eyebrow="Excel"
        title="Data export"
        description="Regenerate VIAC's workbook on demand — the raw session data plus every summary the old pivot tables produced."
        actions={
          <LinkButton href={`/api/export/excel?${query}`} prefetch={false}>
            <Download className="size-4" aria-hidden />
            Download workbook
          </LinkButton>
        }
      />

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

      <div className="grid gap-5 lg:grid-cols-5 lg:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader
            title="What you'll get"
            description={periodLabel(scope.period)}
          />
          <CardBody className="pt-0">
            <dl className="grid grid-cols-2 gap-3">
              <Figure
                icon={<Table2 className="size-4" aria-hidden />}
                label="Rows in Data sheet"
                value={formatNumber(data.totals.sessions)}
              />
              <Figure
                icon={<Layers className="size-4" aria-hidden />}
                label="Participants"
                value={formatNumber(data.totals.participants)}
              />
              <Figure
                icon={<ListFilter className="size-4" aria-hidden />}
                label="Communities"
                value={formatNumber(data.totals.communities)}
              />
              <Figure
                icon={<FileSpreadsheet className="size-4" aria-hidden />}
                label="Sheets"
                value={String(SHEETS.length)}
              />
            </dl>

            <div className="mt-5 rounded-tile bg-blue-50 px-4 py-3 text-[13px] leading-6 text-blue-900 ring-1 ring-inset ring-blue-200/70">
              Columns A–U match <span className="font-medium">Data_Entry</span>{" "}
              exactly, so the formulas in VIAC&rsquo;s own copy still line up. Activity
              type, facilitators, notes and the region sit after the TOTAL column.
            </div>

            <LinkButton
              href={`/api/export/excel?${query}`}
              prefetch={false}
              size="lg"
              className="mt-5 w-full"
            >
              <Download className="size-4" aria-hidden />
              Download .xlsx
            </LinkButton>
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader
            title="Sheets in the workbook"
            description="Nine sheets, all computed from the same aggregation as the dashboard."
          />
          <ul className="divide-y divide-ink-100">
            {SHEETS.map((sheet, i) => (
              <li
                key={sheet.name}
                className="flex items-start gap-3.5 px-5 py-3.5 sm:px-6"
              >
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-ink-100 text-2xs font-semibold text-ink-600 tabular">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-900">
                    {sheet.name}
                    {i === 0 && <Badge tone="blue">Mirrors the workbook</Badge>}
                  </p>
                  <p className="mt-0.5 text-[13px] leading-5 text-ink-500">
                    {sheet.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function Figure({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-tile bg-ink-50/70 px-3.5 py-3">
      <dt className="flex items-center gap-1.5 text-2xs text-ink-500">
        <span className="text-ink-400">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 text-xl font-semibold tracking-[-0.02em] text-ink-900 tabular">
        {value}
      </dd>
    </div>
  );
}
