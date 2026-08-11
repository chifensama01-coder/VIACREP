import "server-only";

import type { Organization } from "@prisma/client";
import type { Aggregate } from "./aggregate";
import {
  REPORT_KIND_LABELS,
  periodLabel,
  reportKind,
  type Scope,
} from "./scope";
import { formatLongDate, formatNumber, formatPercent, share } from "./utils";
import { NARRATIVE_LEAD_INS } from "../../prisma/data/narrative-defaults";

/**
 * A report is **computed statistics + typed narrative**, merged onto the
 * letterhead. This module builds the neutral document that the on-screen
 * preview, the PDF and the Word file all render — so the three can never drift
 * apart, and the numbers are never written by a human.
 *
 * The twelve sections, their order and their wording come from the
 * `Narrative_Report` sheet of the workbook.
 */

export type ReportBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | {
      type: "table";
      head: string[];
      rows: string[][];
      /** Column indexes rendered right-aligned and tabular. */
      numeric?: number[];
      total?: string[];
    }
  | { type: "stats"; items: { label: string; value: string; note?: string }[] };

export type ReportSection = {
  number: number;
  title: string;
  /** AUTO sections are computed; TYPED sections are what staff wrote. */
  source: "auto" | "typed";
  blocks: ReportBlock[];
};

export type SignatureBlock = {
  preparedBy: string;
  preparedDesignation: string;
  approvedBy: string;
  approvedDesignation: string;
  date: string;
};

export type ReportDocument = {
  organizationName: string;
  headerImageUrl: string;
  footerImageUrl: string;
  documentTitle: string;
  reportTitle: string;
  periodLabel: string;
  scopeLine: string | null;
  generatedOn: string;
  sections: ReportSection[];
  signature: SignatureBlock;
  isEmpty: boolean;
};

export type NarrativeText = {
  objectives: string;
  methodology: string;
  lessonsLearnt: string;
  challenges: string;
  recommendations: string;
  preparedBy: string | null;
  preparedDesignation: string | null;
  approvedBy: string | null;
  approvedDesignation: string | null;
};

/** Narrative sections are stored as newline-separated bullets. */
export function toBullets(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[\s•\-*]+/, "").trim())
    .filter(Boolean);
}

export function buildReport({
  scope,
  data,
  narrative,
  organization,
  filterLabels,
}: {
  scope: Scope;
  data: Aggregate;
  narrative: NarrativeText;
  organization: Organization;
  /** Human-readable names for whatever the scope filters on. */
  filterLabels: string[];
}): ReportDocument {
  const kind = reportKind(scope);
  const total = data.totals.participants;
  const sessions = data.totals.sessions;

  const period =
    kind === "activity" && data.periodStart
      ? formatLongDate(data.periodStart)
      : periodLabel(scope.period);

  const scopeLine = filterLabels.length > 0 ? filterLabels.join(" · ") : null;

  const divisions = data.byDivision.map((d) => d.name);
  const divisionPhrase =
    divisions.length === 0
      ? "the programme areas"
      : divisions.length === 1
        ? `${divisions[0]} Division`
        : `${divisions.slice(0, -1).join(", ")} and ${divisions.at(-1)} Divisions`;

  const sections: ReportSection[] = [];

  /* 1. Executive summary — the workbook's opening sentence, generalised. */
  sections.push({
    number: 1,
    title: "Executive Summary",
    source: "auto",
    blocks: [
      {
        type: "paragraph",
        text:
          `During the reporting period, community outreach sessions were conducted across ` +
          `${divisionPhrase} targeting Internally Displaced Persons (IDPs), host communities, ` +
          `women, men, girls and boys. A total of ${formatNumber(sessions)} session` +
          `${sessions === 1 ? "" : "s"} reached ${formatNumber(total)} participant` +
          `${total === 1 ? "" : "s"} across ${formatNumber(data.totals.communities)} ` +
          `communit${data.totals.communities === 1 ? "y" : "ies"} and ` +
          `${formatNumber(data.byThematicArea.length)} thematic area` +
          `${data.byThematicArea.length === 1 ? "" : "s"}.`,
      },
    ],
  });

  /* 2. Key statistics */
  sections.push({
    number: 2,
    title: "Key Statistics",
    source: "auto",
    blocks: [
      {
        type: "stats",
        items: [
          { label: "Total sessions conducted", value: formatNumber(sessions) },
          { label: "Total participants reached", value: formatNumber(total) },
          {
            label: "Male participants",
            value: formatNumber(data.gender.male),
            note: formatPercent(share(data.gender.male, total)),
          },
          {
            label: "Female participants",
            value: formatNumber(data.gender.female),
            note: formatPercent(share(data.gender.female, total)),
          },
          {
            label: "Communities reached",
            value: formatNumber(data.totals.communities),
          },
          {
            label: "Average per session",
            value: formatNumber(data.totals.averagePerSession),
          },
        ],
      },
    ],
  });

  /* 3. Community breakdown */
  sections.push({
    number: 3,
    title: "Community Breakdown",
    source: "auto",
    blocks: [
      {
        type: "paragraph",
        text: "Sessions were conducted in the following communities:",
      },
      {
        type: "table",
        head: ["Community", "Division — Subdivision", "Sessions", "Participants", "Share"],
        numeric: [2, 3, 4],
        rows: data.byCommunity.map((c) => [
          c.name,
          `${c.division} — ${c.subdivision}`,
          formatNumber(c.sessions),
          formatNumber(c.participants),
          formatPercent(c.share),
        ]),
        total: ["Total", "", formatNumber(sessions), formatNumber(total), "100%"],
      },
    ],
  });

  /* 4. Thematic areas */
  sections.push({
    number: 4,
    title: "Thematic Areas Covered",
    source: "auto",
    blocks: [
      {
        type: "paragraph",
        text: "Sessions addressed the following thematic areas:",
      },
      {
        type: "table",
        head: ["Thematic area", "Sessions", "Participants", "Share"],
        numeric: [1, 2, 3],
        rows: data.byThematicArea.map((t) => [
          t.name,
          formatNumber(t.sessions),
          formatNumber(t.participants),
          formatPercent(t.share),
        ]),
      },
    ],
  });

  /* 5. Age groups */
  sections.push({
    number: 5,
    title: "Age Group Distribution",
    source: "auto",
    blocks: [
      {
        type: "paragraph",
        text: "Participants were distributed across the following age groups:",
      },
      {
        type: "table",
        head: ["Age group", "Sessions", "Participants", "Share"],
        numeric: [1, 2, 3],
        rows: data.byAgeGroup.map((a) => [
          a.name,
          formatNumber(a.sessions),
          formatNumber(a.participants),
          formatPercent(a.share),
        ]),
      },
    ],
  });

  /* 6. Target populations */
  sections.push({
    number: 6,
    title: "Target Populations Reached",
    source: "auto",
    blocks: [
      {
        type: "paragraph",
        text: "The following vulnerable and key populations were reached:",
      },
      {
        type: "table",
        head: ["Key population", "Male", "Female", "Total"],
        numeric: [1, 2, 3],
        rows: data.byKeyPopulation.map((k) => [
          k.name,
          k.tracksMale ? formatNumber(k.male) : "—",
          k.tracksFemale ? formatNumber(k.female) : "—",
          formatNumber(k.total),
        ]),
        total: [
          "Total",
          formatNumber(data.gender.male),
          formatNumber(data.gender.female),
          formatNumber(total),
        ],
      },
    ],
  });

  /* 7-10, 12. Typed sections, verbatim from the narrative editor. */
  const typed: [number, string, keyof typeof NARRATIVE_LEAD_INS, string][] = [
    [7, "Objectives", "objectives", narrative.objectives],
    [8, "Methodology", "methodology", narrative.methodology],
    [9, "Lessons Learnt & Feedback", "lessonsLearnt", narrative.lessonsLearnt],
    [10, "Challenges", "challenges", narrative.challenges],
  ];
  for (const [number, title, leadKey, text] of typed) {
    sections.push({
      number,
      title,
      source: "typed",
      blocks: [
        { type: "paragraph", text: NARRATIVE_LEAD_INS[leadKey] },
        { type: "bullets", items: toBullets(text) },
      ],
    });
  }

  /* 11. Conclusion */
  const topThemes = data.byThematicArea.slice(0, 3).map((t) => t.name);
  sections.push({
    number: 11,
    title: "Conclusion",
    source: "auto",
    blocks: [
      {
        type: "paragraph",
        text:
          `The community outreach sessions during this reporting period successfully reached ` +
          `${formatNumber(total)} participant${total === 1 ? "" : "s"} through ` +
          `${formatNumber(sessions)} session${sessions === 1 ? "" : "s"}. ` +
          (topThemes.length > 0
            ? `The sessions addressed critical thematic areas including ${listPhrase(topThemes)}. `
            : "") +
          `Continued engagement with vulnerable populations including IDPs, sex workers, ` +
          `gender minorities and persons with disabilities remains a priority. Despite the ` +
          `challenges encountered, the programme demonstrated strong community participation ` +
          `and valuable lessons were documented for future improvements.`,
      },
    ],
  });

  /* 12. Recommendations */
  sections.push({
    number: 12,
    title: "Recommendations",
    source: "typed",
    blocks: [
      { type: "paragraph", text: NARRATIVE_LEAD_INS.recommendations },
      { type: "bullets", items: toBullets(narrative.recommendations) },
    ],
  });

  return {
    organizationName: organization.name,
    headerImageUrl: organization.headerImageUrl,
    footerImageUrl: organization.footerImageUrl,
    documentTitle: `${organization.name} Community Outreach Sessions`,
    reportTitle: REPORT_KIND_LABELS[kind].toUpperCase(),
    periodLabel: period,
    scopeLine,
    generatedOn: formatLongDate(new Date()),
    sections,
    signature: {
      preparedBy: narrative.preparedBy?.trim() || "",
      preparedDesignation: narrative.preparedDesignation?.trim() || "",
      approvedBy: narrative.approvedBy?.trim() || "",
      approvedDesignation: narrative.approvedDesignation?.trim() || "",
      date: formatLongDate(new Date()),
    },
    isEmpty: sessions === 0,
  };
}

function listPhrase(items: string[]) {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}
