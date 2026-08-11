import "server-only";

import { z } from "zod";
import { Sex } from "@prisma/client";
import { db } from "./db";
import { parseDateInput } from "./utils";

/**
 * Only Date and Community are required — everything else on the `Data_Entry`
 * row is optional, and an empty count cell means zero. That is deliberate:
 * staff transcribe from paper attendance sheets that are often partly filled.
 */
export const sessionInputSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date of the session"),
  communityId: z.string().min(1, "Choose the community"),
  projectId: z.string().optional().nullable(),
  thematicAreaId: z.string().optional().nullable(),
  ageGroupId: z.string().optional().nullable(),
  activityTypeId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  facilitators: z.array(z.string().trim().min(1)).max(20).default([]),
  /** `${keyPopulationId}:${MALE|FEMALE}` → count */
  counts: z.record(z.string(), z.number().int().min(0).max(100_000)).default({}),
});

export type SessionInput = z.infer<typeof sessionInputSchema>;

const blank = (value: string | null | undefined) =>
  value && value.length > 0 ? value : null;

/** Splits `counts` into rows and totals them, ignoring zeros. */
function toCountRows(counts: Record<string, number>) {
  const rows: { keyPopulationId: string; sex: Sex; count: number }[] = [];
  let total = 0;
  for (const [key, value] of Object.entries(counts)) {
    if (!value || value <= 0) continue;
    const [keyPopulationId, sex] = key.split(":");
    if (!keyPopulationId || (sex !== "MALE" && sex !== "FEMALE")) continue;
    rows.push({ keyPopulationId, sex: sex as Sex, count: value });
    total += value;
  }
  return { rows, total };
}

export async function createSession(input: SessionInput, userId: string) {
  const { rows, total } = toCountRows(input.counts);

  return db.session.create({
    data: {
      date: parseDateInput(input.date),
      communityId: input.communityId,
      projectId: blank(input.projectId),
      thematicAreaId: blank(input.thematicAreaId),
      ageGroupId: blank(input.ageGroupId),
      activityTypeId: blank(input.activityTypeId),
      notes: blank(input.notes),
      totalParticipants: total,
      createdById: userId,
      counts: { create: rows },
      facilitators: {
        create: dedupe(input.facilitators).map((name) => ({ name })),
      },
    },
  });
}

export async function updateSession(id: string, input: SessionInput) {
  const { rows, total } = toCountRows(input.counts);

  // Counts and facilitators are small child sets; replacing them wholesale is
  // simpler and safer than diffing, and keeps `totalParticipants` honest.
  return db.$transaction([
    db.sessionCount.deleteMany({ where: { sessionId: id } }),
    db.sessionFacilitator.deleteMany({ where: { sessionId: id } }),
    db.session.update({
      where: { id },
      data: {
        date: parseDateInput(input.date),
        communityId: input.communityId,
        projectId: blank(input.projectId),
        thematicAreaId: blank(input.thematicAreaId),
        ageGroupId: blank(input.ageGroupId),
        activityTypeId: blank(input.activityTypeId),
        notes: blank(input.notes),
        totalParticipants: total,
        counts: { create: rows },
        facilitators: {
          create: dedupe(input.facilitators).map((name) => ({ name })),
        },
      },
    }),
  ]);
}

function dedupe(names: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const name = raw.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/* Form data                                                                   */
/* -------------------------------------------------------------------------- */

export async function getSessionFormData() {
  const [
    communities,
    projects,
    thematicAreas,
    ageGroups,
    activityTypes,
    keyPopulations,
    facilitatorNames,
  ] = await Promise.all([
    db.community.findMany({
      orderBy: [{ name: "asc" }],
      include: {
        subdivision: {
          include: { division: { include: { region: true } } },
        },
      },
    }),
    db.project.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.thematicArea.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.ageGroup.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.activityType.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.keyPopulation.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    db.sessionFacilitator.findMany({
      distinct: ["name"],
      select: { name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    communities: communities.map((c) => ({
      id: c.id,
      name: c.name,
      subdivision: c.subdivision.name,
      division: c.subdivision.division.name,
      region: c.subdivision.division.region.name,
      /** The workbook's own "Fako - Buea" form, auto-filled on selection. */
      divisionSubdivision: `${c.subdivision.division.name} - ${c.subdivision.name}`,
      isCustom: c.isCustom,
    })),
    projects: projects.map(pick),
    thematicAreas: thematicAreas.map(pick),
    ageGroups: ageGroups.map(pick),
    activityTypes: activityTypes.map(pick),
    keyPopulations: keyPopulations.map((k) => ({
      id: k.id,
      name: k.name,
      shortName: k.shortName,
      tracksMale: k.tracksMale,
      tracksFemale: k.tracksFemale,
      maleLabel: k.maleLabel,
      femaleLabel: k.femaleLabel,
    })),
    facilitatorNames: facilitatorNames.map((f) => f.name),
    subdivisions: await db.subdivision.findMany({
      orderBy: [{ division: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: { division: { include: { region: true } } },
    }).then((rows) =>
      rows.map((s) => ({
        id: s.id,
        name: s.name,
        division: s.division.name,
        region: s.division.region.name,
        label: `${s.division.name} - ${s.name}`,
      })),
    ),
  };
}

function pick(row: { id: string; name: string }) {
  return { id: row.id, name: row.name };
}

export type SessionFormData = Awaited<ReturnType<typeof getSessionFormData>>;
