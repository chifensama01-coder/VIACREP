import Image from "next/image";
import { redirect } from "next/navigation";
import {
  CalendarClock,
  FolderKanban,
  Layers3,
  MapPin,
  Palette,
  ShieldCheck,
  Tags,
  Users2,
} from "lucide-react";
import { canManageSettings, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrganization } from "@/lib/narrative";
import { ROLE_DESCRIPTIONS, ROLE_LABEL_BY_ROLE } from "@/lib/role-labels";
import { formatNumber } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Avatar, Badge } from "@/components/ui/badge";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  if (!canManageSettings(user)) redirect("/dashboard");

  const [
    organization,
    users,
    regions,
    communityCount,
    customCommunities,
    projects,
    thematicAreas,
    activityTypes,
    ageGroups,
    keyPopulations,
  ] = await Promise.all([
    getOrganization(),
    db.user.findMany({
      orderBy: { name: "asc" },
      include: { division: { select: { name: true } } },
    }),
    db.region.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        divisions: {
          orderBy: { sortOrder: "asc" },
          include: {
            subdivisions: {
              orderBy: { sortOrder: "asc" },
              include: { _count: { select: { communities: true } } },
            },
          },
        },
      },
    }),
    db.community.count(),
    db.community.count({ where: { isCustom: true } }),
    db.project.findMany({ orderBy: { sortOrder: "asc" } }),
    db.thematicArea.findMany({ orderBy: { sortOrder: "asc" } }),
    db.activityType.findMany({ orderBy: { sortOrder: "asc" } }),
    db.ageGroup.findMany({ orderBy: { sortOrder: "asc" } }),
    db.keyPopulation.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const brand = organization.brandTokens as Record<string, string>;

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="The lookup lists, geography and letterhead behind every form and report."
      />

      <div className="space-y-5 lg:space-y-6">
        {/* Letterhead + brand */}
        <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Letterhead"
              description="Printed at the top and bottom of every PDF and Word report."
            />
            <CardBody className="space-y-3 pt-0">
              <div className="overflow-hidden rounded-tile ring-1 ring-ink-200/70">
                <Image
                  src={organization.headerImageUrl}
                  alt="Letterhead header"
                  width={1390}
                  height={310}
                  className="w-full"
                />
              </div>
              <div className="overflow-hidden rounded-tile ring-1 ring-ink-200/70">
                <Image
                  src={organization.footerImageUrl}
                  alt="Letterhead footer"
                  width={1389}
                  height={195}
                  className="w-full"
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Brand" description="Sampled from the VIAC logo." />
            <CardBody className="pt-0">
              <ul className="space-y-2.5">
                {[
                  ["Blue", brand.blue, "Primary — nav, buttons, main series"],
                  ["Gold", brand.gold, "Accent — highlights, second series"],
                  ["Charcoal", brand.charcoal, "Text and dark surfaces"],
                  ["Light grey", brand.lightGrey, "Page background"],
                ].map(([name, hex, use]) => (
                  <li key={name} className="flex items-center gap-3">
                    <span
                      className="size-9 shrink-0 rounded-lg ring-1 ring-ink-900/10"
                      style={{ backgroundColor: hex }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-medium text-ink-900">
                        {name}{" "}
                        <code className="ml-1 font-mono text-2xs text-ink-400">
                          {hex}
                        </code>
                      </span>
                      <span className="block truncate text-2xs text-ink-500">
                        {use}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-start gap-2 border-t border-ink-100 pt-3 text-2xs leading-5 text-ink-400">
                <Palette className="mt-px size-3.5 shrink-0" aria-hidden />
                Each colour is expanded into a 50–900 ramp; chart series were
                checked for colour-blind separation and contrast.
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Lookups */}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 lg:gap-6">
          <LookupCard
            icon={<FolderKanban className="size-4" aria-hidden />}
            title="Projects"
            note="From the workbook's dropdown"
            items={projects.map((p) => p.name)}
          />
          <LookupCard
            icon={<Tags className="size-4" aria-hidden />}
            title="Thematic areas"
            note="Free entry — anyone can add"
            items={thematicAreas.map((t) => t.name)}
          />
          <LookupCard
            icon={<Layers3 className="size-4" aria-hidden />}
            title="Activity types"
            note="Added for VIAC"
            items={activityTypes.map((a) => a.name)}
          />
          <LookupCard
            icon={<CalendarClock className="size-4" aria-hidden />}
            title="Age groups"
            note="From the workbook's dropdown"
            items={ageGroups.map((a) => a.name)}
          />
        </div>

        {/* Key populations */}
        <Card>
          <CardHeader
            title="Participant count matrix"
            description="The key populations tracked on every session, and which sexes each one counts."
          />
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr>
                  {["Key population", "Male", "Female", "Data_Entry columns"].map(
                    (label) => (
                      <th
                        key={label}
                        className="border-b border-ink-100 bg-ink-50/80 px-5 py-2.5 text-2xs font-semibold tracking-[0.08em] text-ink-500 uppercase whitespace-nowrap"
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {keyPopulations.map((kp) => (
                  <tr key={kp.id} className="transition-colors hover:bg-blue-50/40">
                    <td className="border-b border-ink-100 px-5 py-2.5 font-medium text-ink-900">
                      {kp.name}
                    </td>
                    <td className="border-b border-ink-100 px-5 py-2.5">
                      {kp.tracksMale ? (
                        <Badge tone="blue">{kp.maleLabel}</Badge>
                      ) : (
                        <span className="text-ink-300">—</span>
                      )}
                    </td>
                    <td className="border-b border-ink-100 px-5 py-2.5">
                      {kp.tracksFemale ? (
                        <Badge tone="gold">{kp.femaleLabel}</Badge>
                      ) : (
                        <span className="text-ink-300">—</span>
                      )}
                    </td>
                    <td className="border-b border-ink-100 px-5 py-2.5 font-mono text-2xs text-ink-500">
                      {[kp.exportMaleHeader, kp.exportFemaleHeader]
                        .filter(Boolean)
                        .join("  ·  ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Geography + people */}
        <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
          <Card>
            <CardHeader
              title="Geography"
              description={`${formatNumber(communityCount)} communities${customCommunities > 0 ? ` · ${customCommunities} added by staff` : ""}`}
              action={
                <span className="flex items-center gap-1.5 text-2xs text-ink-400">
                  <MapPin className="size-3.5" aria-hidden />
                  Region → Division → Subdivision → Community
                </span>
              }
            />
            <CardBody className="space-y-4 pt-0">
              {regions.map((region) => (
                <div key={region.id}>
                  <p className="mb-2 text-2xs font-semibold tracking-[0.1em] text-blue-700 uppercase">
                    {region.name}
                  </p>
                  <div className="space-y-2">
                    {region.divisions.map((division) => (
                      <div
                        key={division.id}
                        className="rounded-tile bg-ink-50/70 px-3.5 py-2.5"
                      >
                        <p className="text-[13px] font-medium text-ink-900">
                          {division.name}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {division.subdivisions.map((sub) => (
                            <Badge key={sub.id} tone="neutral">
                              {sub.name}
                              <span className="ml-0.5 text-ink-400 tabular">
                                {sub._count.communities}
                              </span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="People and roles"
              description="Roles scope what you can see, never whether you can write a report."
              action={
                <span className="flex items-center gap-1.5 text-2xs text-ink-400">
                  <Users2 className="size-3.5" aria-hidden />
                  {users.length}
                </span>
              }
            />
            <ul className="divide-y divide-ink-100">
              {users.map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3 sm:px-6">
                  <Avatar name={u.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink-900">
                      {u.name}
                    </p>
                    <p className="truncate text-2xs text-ink-500">
                      {u.designation ?? u.email}
                      {u.division ? ` · ${u.division.name}` : ""}
                    </p>
                  </div>
                  <Badge tone={u.role === "OFFICER" ? "blue" : "gold"}>
                    {ROLE_LABEL_BY_ROLE[u.role]}
                  </Badge>
                </li>
              ))}
            </ul>
            <CardBody className="pt-4">
              <ul className="space-y-2 border-t border-ink-100 pt-4">
                {(["OFFICER", "COORDINATOR", "APPROVER"] as const).map((role) => (
                  <li key={role} className="flex items-start gap-2.5">
                    <ShieldCheck
                      className="mt-0.5 size-3.5 shrink-0 text-ink-300"
                      aria-hidden
                    />
                    <p className="text-2xs leading-5 text-ink-500">
                      <span className="font-semibold text-ink-700">
                        {ROLE_LABEL_BY_ROLE[role]}
                      </span>{" "}
                      — {ROLE_DESCRIPTIONS[role]}
                    </p>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function LookupCard({
  icon,
  title,
  note,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  items: string[];
}) {
  return (
    <Card>
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
        <span className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink-900">{title}</p>
          <p className="truncate text-2xs text-ink-400">{note}</p>
        </div>
        <span className="ml-auto text-[13px] font-semibold text-ink-400 tabular">
          {items.length}
        </span>
      </div>
      <CardBody className="pt-0">
        <ul className="space-y-1">
          {items.map((item) => (
            <li
              key={item}
              className="truncate rounded-md px-2 py-1 text-[13px] text-ink-700 transition-colors hover:bg-ink-50"
              title={item}
            >
              {item}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
