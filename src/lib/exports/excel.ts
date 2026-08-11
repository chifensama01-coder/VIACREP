import "server-only";

import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import type { Aggregate } from "@/lib/aggregate";
import { formatDate } from "@/lib/utils";

/**
 * The general Excel export — VIAC's familiar workbook, regenerated on demand.
 *
 * The **Data** sheet is `Data_Entry` column for column, right down to the two
 * header rows and the odd MALE / MALE: / MALE. / MALE- / MALE_ column names the
 * original had to invent because Excel rejects duplicate headers. Anything the
 * platform added beyond the sheet (activity type, facilitators, notes, who
 * logged it) sits after the TOTAL column, so columns A-U are untouched and
 * VIAC's own formulas still line up.
 *
 * The **Summary** sheets replace the workbook's four pivot tables and the
 * Weekly_Monthly_Summary sheet. Every figure comes from the same aggregation
 * layer the dashboard and the reports use.
 */

const BLUE = "FF118AB9";
const BLUE_DEEP = "FF13546D";
const GOLD = "FFDDA328";
const INK = "FF2A2A2A";
const HEAD_FILL = "FFF4F6F9";
const HAIRLINE = "FFDBDDDE";

export async function renderWorkbook({
  data,
  scopeLabel,
  filterLabels,
  generatedBy,
}: {
  data: Aggregate;
  scopeLabel: string;
  filterLabels: string[];
  generatedBy: string;
}): Promise<Buffer> {
  const keyPopulations = await db.keyPopulation.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Vision in Action Cameroon — VIAC Reports";
  workbook.created = new Date();

  buildDataSheet(workbook, data, keyPopulations);
  buildSummarySheet(workbook, data, scopeLabel, filterLabels, generatedBy);
  buildBreakdownSheet(workbook, "By Community", ["Community", "Division — Subdivision"],
    data.byCommunity.map((c) => [c.name, `${c.division} — ${c.subdivision}`, c.sessions, c.participants, c.share]),
  );
  buildBreakdownSheet(workbook, "By Thematic Area", ["Thematic area"],
    data.byThematicArea.map((t) => [t.name, t.sessions, t.participants, t.share]),
  );
  buildBreakdownSheet(workbook, "By Project", ["Project"],
    data.byProject.map((p) => [p.name, p.sessions, p.participants, p.share]),
  );
  buildBreakdownSheet(workbook, "By Age Group", ["Age group"],
    data.byAgeGroup.map((a) => [a.name, a.sessions, a.participants, a.share]),
  );
  buildBreakdownSheet(workbook, "By Activity Type", ["Activity type"],
    data.byActivityType.map((a) => [a.name, a.sessions, a.participants, a.share]),
  );
  buildKeyPopulationSheet(workbook, data);
  buildMonthlySheet(workbook, data);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/* -------------------------------------------------------------------------- */
/* Data — a faithful `Data_Entry`                                              */
/* -------------------------------------------------------------------------- */

type KeyPopulationRow = {
  id: string;
  exportGroupLabel: string;
  exportMaleHeader: string | null;
  exportFemaleHeader: string | null;
};

function buildDataSheet(
  workbook: ExcelJS.Workbook,
  data: Aggregate,
  keyPopulations: KeyPopulationRow[],
) {
  const sheet = workbook.addWorksheet("Data", {
    views: [{ state: "frozen", xSplit: 5, ySplit: 2 }],
  });

  // Row 1: the key-population group labels sitting above their MALE/FEMALE pair.
  // Row 2: the column headers themselves.
  const groupRow: (string | null)[] = [null, null, null, null, null, null, null, null];
  const headerRow: string[] = [
    "Date",
    "Week",
    "Month",
    "Division - Subdivision",
    "Communities",
    "Thematic Area",
    "Age Group",
    "Project",
  ];

  /** Column order must match the sheet: each population's MALE then FEMALE. */
  const countColumns: { keyPopulationId: string; sex: "MALE" | "FEMALE" }[] = [];

  for (const kp of keyPopulations) {
    const headers: [string | null, "MALE" | "FEMALE"][] = [
      [kp.exportMaleHeader, "MALE"],
      [kp.exportFemaleHeader, "FEMALE"],
    ];
    // "General" is the one pair the sheet writes as WOMEN then MEN.
    const ordered =
      kp.exportFemaleHeader === "WOMEN" ? headers.slice().reverse() : headers;

    let first = true;
    for (const [header, sex] of ordered) {
      if (!header) continue;
      groupRow.push(first ? kp.exportGroupLabel || null : null);
      headerRow.push(header);
      countColumns.push({ keyPopulationId: kp.id, sex });
      first = false;
    }
  }

  groupRow.push("TOTAL");
  headerRow.push("Participants");

  // Everything the platform added, kept clear of columns A-U.
  const extraHeaders = [
    "Type of Activity",
    "Facilitators",
    "Notes",
    "Logged by",
    "Region",
  ];
  for (const header of extraHeaders) {
    groupRow.push(null);
    headerRow.push(header);
  }

  sheet.addRow(groupRow);
  sheet.addRow(headerRow);

  for (const row of data.rows) {
    const values: (string | number | Date | null)[] = [
      row.date,
      row.week,
      row.month,
      row.divisionSubdivision,
      row.community,
      row.thematicArea,
      row.ageGroup,
      row.project,
    ];
    for (const column of countColumns) {
      // A blank cell in the original sheet means zero.
      values.push(row.counts[column.keyPopulationId]?.[column.sex] ?? 0);
    }
    values.push(row.total);
    values.push(row.activityType);
    values.push(row.facilitators.join(", "));
    values.push(row.notes);
    values.push(row.createdBy);
    values.push(row.region);
    sheet.addRow(values);
  }

  const lastColumn = headerRow.length;
  const firstCountColumn = 9;
  const totalColumn = 8 + countColumns.length + 1;

  // --- styling -------------------------------------------------------------
  const group = sheet.getRow(1);
  group.height = 20;
  group.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, size: 9, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_DEEP } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  const head = sheet.getRow(2);
  head.height = 26;
  head.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, size: 9, color: { argb: INK } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD_FILL } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: HAIRLINE } },
      bottom: { style: "medium", color: { argb: BLUE } },
      left: { style: "thin", color: { argb: HAIRLINE } },
      right: { style: "thin", color: { argb: HAIRLINE } },
    };
  });

  sheet.getColumn(1).numFmt = "dd/mm/yyyy";
  sheet.getColumn(1).width = 12;
  sheet.getColumn(2).width = 7;
  sheet.getColumn(3).width = 11;
  sheet.getColumn(4).width = 22;
  sheet.getColumn(5).width = 26;
  sheet.getColumn(6).width = 32;
  sheet.getColumn(7).width = 14;
  sheet.getColumn(8).width = 16;
  for (let c = firstCountColumn; c <= totalColumn; c++) sheet.getColumn(c).width = 10;
  sheet.getColumn(totalColumn + 1).width = 22; // activity type
  sheet.getColumn(totalColumn + 2).width = 30; // facilitators
  sheet.getColumn(totalColumn + 3).width = 30; // notes
  sheet.getColumn(totalColumn + 4).width = 18; // logged by
  sheet.getColumn(totalColumn + 5).width = 14; // region

  for (let r = 3; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    row.eachCell({ includeEmpty: true }, (cell, c) => {
      cell.border = {
        bottom: { style: "hair", color: { argb: HAIRLINE } },
      };
      if (c >= firstCountColumn && c <= totalColumn) {
        cell.alignment = { horizontal: "right" };
        cell.numFmt = "#,##0";
      }
      if (c === totalColumn) {
        cell.font = { bold: true, color: { argb: BLUE_DEEP } };
      }
    });
    if (r % 2 === 0) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFBFCFD" } };
      });
    }
  }

  if (data.rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 2, column: 1 },
      to: { row: 2 + data.rows.length, column: lastColumn },
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Summary                                                                     */
/* -------------------------------------------------------------------------- */

function buildSummarySheet(
  workbook: ExcelJS.Workbook,
  data: Aggregate,
  scopeLabel: string,
  filterLabels: string[],
  generatedBy: string,
) {
  const sheet = workbook.addWorksheet("Summary");
  sheet.getColumn(1).width = 34;
  sheet.getColumn(2).width = 20;
  sheet.getColumn(3).width = 16;

  sheet.mergeCells("A1:C1");
  const title = sheet.getCell("A1");
  title.value = "VISION IN ACTION CAMEROON — COMMUNITY OUTREACH SESSIONS";
  title.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BLUE_DEEP } };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 30;

  sheet.mergeCells("A2:C2");
  const subtitle = sheet.getCell("A2");
  subtitle.value = [scopeLabel, ...filterLabels].join("  ·  ");
  subtitle.font = { bold: true, size: 10, color: { argb: INK } };
  subtitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1E6D3" } };
  subtitle.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(2).height = 22;

  let row = 4;
  const stat = (label: string, value: number | string, note?: string) => {
    sheet.getCell(row, 1).value = label;
    sheet.getCell(row, 1).font = { size: 10, color: { argb: "FF64686A" } };
    const cell = sheet.getCell(row, 2);
    cell.value = value;
    cell.font = { bold: true, size: 12, color: { argb: INK } };
    if (typeof value === "number") cell.numFmt = "#,##0";
    cell.alignment = { horizontal: "right" };
    if (note !== undefined) {
      sheet.getCell(row, 3).value = note;
      sheet.getCell(row, 3).font = { bold: true, size: 10, color: { argb: GOLD } };
      sheet.getCell(row, 3).alignment = { horizontal: "right" };
    }
    row++;
  };

  const total = data.totals.participants;
  const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : "0%");

  sheet.getCell(row, 1).value = "KEY STATISTICS";
  sheet.getCell(row, 1).font = { bold: true, size: 9, color: { argb: BLUE } };
  row += 1;

  stat("Total sessions conducted", data.totals.sessions);
  stat("Total participants reached", data.totals.participants);
  stat("Male participants", data.gender.male, pct(data.gender.male));
  stat("Female participants", data.gender.female, pct(data.gender.female));
  stat("Communities reached", data.totals.communities);
  stat("Facilitators involved", data.totals.facilitators);
  stat("Average participants per session", data.totals.averagePerSession);

  row += 1;
  sheet.getCell(row, 1).value = "GENERATED";
  sheet.getCell(row, 1).font = { bold: true, size: 9, color: { argb: BLUE } };
  row += 1;
  stat("Generated on", formatDate(new Date()));
  stat("Generated by", generatedBy);

  row += 1;
  sheet.mergeCells(row, 1, row, 3);
  const note = sheet.getCell(row, 1);
  note.value =
    "Every figure here is computed from the Data sheet — the same aggregation the dashboard and the narrative reports use.";
  note.font = { italic: true, size: 9, color: { argb: "FF64686A" } };
  note.alignment = { wrapText: true, vertical: "top" };
  sheet.getRow(row).height = 28;
}

/* -------------------------------------------------------------------------- */
/* Breakdowns — the workbook's pivot sheets                                    */
/* -------------------------------------------------------------------------- */

function buildBreakdownSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  labelColumns: string[],
  rows: (string | number)[][],
) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const headers = [...labelColumns, "Sessions", "Participants", "Share"];
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);

  const shareColumn = headers.length;
  const participantsColumn = headers.length - 1;
  const sessionsColumn = headers.length - 2;

  labelColumns.forEach((_, i) => {
    sheet.getColumn(i + 1).width = i === 0 ? 34 : 26;
  });
  sheet.getColumn(sessionsColumn).width = 12;
  sheet.getColumn(participantsColumn).width = 14;
  sheet.getColumn(shareColumn).width = 10;

  styleHeaderRow(sheet.getRow(1));

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    row.getCell(sessionsColumn).numFmt = "#,##0";
    row.getCell(participantsColumn).numFmt = "#,##0";
    row.getCell(participantsColumn).font = { bold: true, color: { argb: BLUE_DEEP } };
    row.getCell(shareColumn).numFmt = "0%";
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { bottom: { style: "hair", color: { argb: HAIRLINE } } };
    });
  }

  if (rows.length > 0) {
    // A data bar makes the ranking readable without opening a chart.
    const column = columnLetter(participantsColumn);
    sheet.addConditionalFormatting(
      dataBar(`${column}2:${column}${sheet.rowCount}`, BLUE),
    );
  }
}

/**
 * exceljs writes a `color` on data-bar rules but omits it from its type
 * definitions, so this is the one place that reaches past them.
 */
function dataBar(ref: string, argb: string): ExcelJS.ConditionalFormattingOptions {
  return {
    ref,
    rules: [
      {
        type: "dataBar",
        priority: 1,
        minLength: 0,
        maxLength: 100,
        gradient: false,
        color: { argb },
        cfvo: [{ type: "min" }, { type: "max" }],
      } as ExcelJS.DataBarRuleType & { color: { argb: string } },
    ],
  };
}

function buildKeyPopulationSheet(workbook: ExcelJS.Workbook, data: Aggregate) {
  const sheet = workbook.addWorksheet("Key Populations", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.addRow(["Key population", "Male", "Female", "Total", "Share"]);
  for (const kp of data.byKeyPopulation) {
    sheet.addRow([
      kp.name,
      kp.tracksMale ? kp.male : null,
      kp.tracksFemale ? kp.female : null,
      kp.total,
      data.totals.participants > 0 ? kp.total / data.totals.participants : 0,
    ]);
  }
  sheet.addRow([
    "Total",
    data.gender.male,
    data.gender.female,
    data.totals.participants,
    data.totals.participants > 0 ? 1 : 0,
  ]);

  sheet.getColumn(1).width = 42;
  for (let c = 2; c <= 5; c++) sheet.getColumn(c).width = 12;
  styleHeaderRow(sheet.getRow(1));

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    for (let c = 2; c <= 4; c++) row.getCell(c).numFmt = "#,##0";
    row.getCell(5).numFmt = "0%";
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { bottom: { style: "hair", color: { argb: HAIRLINE } } };
    });
  }
  const totalRow = sheet.getRow(sheet.rowCount);
  totalRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, color: { argb: INK } };
    cell.border = { top: { style: "medium", color: { argb: INK } } };
  });
}

function buildMonthlySheet(workbook: ExcelJS.Workbook, data: Aggregate) {
  const sheet = workbook.addWorksheet("Monthly Totals", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.addRow(["Period", "Sessions", "Participants", "Male", "Female"]);
  for (const point of data.overTime) {
    sheet.addRow([
      point.label,
      point.sessions,
      point.participants,
      point.male,
      point.female,
    ]);
  }

  sheet.getColumn(1).width = 18;
  for (let c = 2; c <= 5; c++) sheet.getColumn(c).width = 14;
  styleHeaderRow(sheet.getRow(1));

  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    for (let c = 2; c <= 5; c++) row.getCell(c).numFmt = "#,##0";
    row.getCell(3).font = { bold: true, color: { argb: BLUE_DEEP } };
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = { bottom: { style: "hair", color: { argb: HAIRLINE } } };
    });
  }

  if (data.overTime.length > 0) {
    sheet.addConditionalFormatting(dataBar(`C2:C${sheet.rowCount}`, GOLD));
  }
}

/* -------------------------------------------------------------------------- */

function styleHeaderRow(row: ExcelJS.Row) {
  row.height = 24;
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, size: 9, color: { argb: INK } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD_FILL } };
    cell.alignment = { vertical: "middle" };
    cell.border = {
      bottom: { style: "medium", color: { argb: BLUE } },
    };
  });
}

function columnLetter(index: number) {
  let letter = "";
  let n = index;
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    n = Math.floor((n - 1) / 26);
  }
  return letter;
}
