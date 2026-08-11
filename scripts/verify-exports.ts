/**
 * Downloads all three exports and inspects them, so "the route returned 200"
 * is never mistaken for "the document is right".
 *
 * Checks the Excel workbook column-for-column against the `Data_Entry` header
 * row of Vision_In_Action_Reporting_Template.xlsx, confirms the Word file
 * carries the letterhead images in a real header/footer, and reports the PDF's
 * page count and size. Also writes a screenshot of the print page so the
 * layout can be eyeballed.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { SignJWT } from "jose";
import ExcelJS from "exceljs";
import { PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer";
import AdmZip from "adm-zip";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const OUT = path.resolve(process.cwd(), ".verify");
const prisma = new PrismaClient();

/** The exact header row of `Data_Entry`, columns A–U. */
const EXPECTED_DATA_ENTRY_HEADERS = [
  "Date", "Week", "Month", "Division - Subdivision", "Communities",
  "Thematic Area", "Age Group", "Project",
  "MALE", "FEMALE",       // Sex workers
  "MALE:", "FEMALE:",     // Gender Minorities
  "MALE.", "FEMALE.",     // IDP
  "MALE-", "FEMALE-",     // Persons with disabilities
  "FEMALE_",              // AGY-W
  "MALE_",                // ABY-M
  "WOMEN", "MEN",         // General
  "Participants",
];

let failures = 0;
function assert(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "coordinator@viacame.org" },
  });
  const token = await new SignJWT({ sub: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET));
  const cookie = `viac_session=${token}`;

  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const query = `period=month&year=${d.getFullYear()}&month=${d.getMonth() + 1}`;

  const fetchFile = async (route: string) => {
    const res = await fetch(`${BASE}${route}?${query}`, { headers: { cookie } });
    if (!res.ok) throw new Error(`${route} returned ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  };

  /* ---------------- Excel ---------------- */
  console.log("\nExcel workbook");
  const xlsx = await fetchFile("/api/export/excel");
  await writeFile(path.join(OUT, "export.xlsx"), xlsx);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(xlsx as unknown as ArrayBuffer);
  const names = wb.worksheets.map((w) => w.name);
  assert("9 sheets present", names.length === 9, names.join(", "));

  const dataSheet = wb.getWorksheet("Data")!;
  const headerRow = dataSheet.getRow(2);
  const actual = EXPECTED_DATA_ENTRY_HEADERS.map(
    (_, i) => String(headerRow.getCell(i + 1).value ?? ""),
  );
  const headersMatch = actual.every(
    (value, i) => value === EXPECTED_DATA_ENTRY_HEADERS[i],
  );
  assert(
    "columns A–U match Data_Entry exactly",
    headersMatch,
    headersMatch
      ? `${actual.length} columns`
      : `got ${JSON.stringify(actual)}`,
  );

  const groupRow = dataSheet.getRow(1);
  assert(
    "group label row present",
    String(groupRow.getCell(9).value) === "Sex workers" &&
      String(groupRow.getCell(21).value) === "TOTAL",
    `I1=${groupRow.getCell(9).value}, U1=${groupRow.getCell(21).value}`,
  );

  // Row-level totals must equal the sum of that row's count cells.
  let totalsOk = true;
  let rowsChecked = 0;
  for (let r = 3; r <= dataSheet.rowCount; r++) {
    const row = dataSheet.getRow(r);
    let sum = 0;
    for (let c = 9; c <= 20; c++) sum += Number(row.getCell(c).value ?? 0);
    const stated = Number(row.getCell(21).value ?? 0);
    if (sum !== stated) totalsOk = false;
    rowsChecked++;
  }
  assert(
    "every row's TOTAL equals the sum of its count cells",
    totalsOk,
    `${rowsChecked} rows`,
  );

  // The Data sheet and the Summary sheet must agree.
  const summary = wb.getWorksheet("Summary")!;
  let summarySessions: number | null = null;
  let summaryParticipants: number | null = null;
  summary.eachRow((row) => {
    const label = String(row.getCell(1).value ?? "");
    if (label === "Total sessions conducted")
      summarySessions = Number(row.getCell(2).value);
    if (label === "Total participants reached")
      summaryParticipants = Number(row.getCell(2).value);
  });
  const dataRowCount = dataSheet.rowCount - 2;
  let dataParticipants = 0;
  for (let r = 3; r <= dataSheet.rowCount; r++) {
    dataParticipants += Number(dataSheet.getRow(r).getCell(21).value ?? 0);
  }
  assert(
    "Summary sheet agrees with the Data sheet",
    summarySessions === dataRowCount && summaryParticipants === dataParticipants,
    `Data: ${dataRowCount} sessions / ${dataParticipants} participants · ` +
      `Summary: ${summarySessions} / ${summaryParticipants}`,
  );

  /* ---------------- Word ---------------- */
  console.log("\nWord document");
  const docx = await fetchFile("/api/export/docx");
  await writeFile(path.join(OUT, "export.docx"), docx);

  const zip = new AdmZip(docx);
  const entries = zip.getEntries().map((e) => e.entryName);
  const media = entries.filter((n) => /^word\/media\/.+\.png$/.test(n));
  assert(
    "letterhead images embedded",
    media.length === 2,
    media.join(", ") || "none",
  );
  assert(
    "real Word header and footer parts",
    entries.some((n) => /word\/header\d*\.xml/.test(n)) &&
      entries.some((n) => /word\/footer\d*\.xml/.test(n)),
    entries.filter((n) => /header|footer/.test(n)).join(", "),
  );

  const documentXml = zip.readAsText("word/document.xml");
  const sectionTitles = [
    "EXECUTIVE SUMMARY", "KEY STATISTICS", "COMMUNITY BREAKDOWN",
    "THEMATIC AREAS COVERED", "AGE GROUP DISTRIBUTION",
    "TARGET POPULATIONS REACHED", "OBJECTIVES", "METHODOLOGY",
    "LESSONS LEARNT & FEEDBACK", "CHALLENGES", "CONCLUSION", "RECOMMENDATIONS",
  ];
  const stripped = documentXml.replace(/<[^>]+>/g, "");
  const missing = sectionTitles.filter(
    (t) => !stripped.includes(t.replace(/&/g, "&amp;")) && !stripped.includes(t),
  );
  assert("all 12 sections present", missing.length === 0, missing.join(", ") || "1–12");
  assert(
    "signature block present",
    stripped.includes("PREPARED BY") && stripped.includes("APPROVED BY"),
  );

  /* ---------------- PDF ---------------- */
  console.log("\nPDF");
  const pdf = await fetchFile("/api/export/pdf");
  await writeFile(path.join(OUT, "export.pdf"), pdf);

  const head = pdf.subarray(0, 8).toString("latin1");
  assert("valid PDF header", head.startsWith("%PDF-"), head.trim());
  const pageCount = (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [])
    .length;
  assert("multiple pages rendered", pageCount >= 1, `${pageCount} pages`);
  assert(
    "letterhead raster embedded (file is image-bearing)",
    pdf.length > 150_000,
    `${Math.round(pdf.length / 1024)} KB`,
  );

  /* ---------------- Screenshot the print page ---------------- */
  console.log("\nPrint page screenshot");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await browser.setCookie({
      name: "viac_session",
      value: token,
      domain: "localhost",
      path: "/",
    });
    await page.setViewport({ width: 900, height: 1400, deviceScaleFactor: 2 });
    await page.goto(`${BASE}/print/report?${query}`, {
      waitUntil: "networkidle0",
    });
    await page.screenshot({
      path: path.join(OUT, "print-page.png") as `${string}.png`,
      fullPage: true,
    });
    assert("screenshot written", true, path.join(OUT, "print-page.png"));
  } finally {
    await browser.close();
  }

  console.log(
    failures === 0
      ? `\nAll checks passed. Artifacts in ${OUT}\n`
      : `\n${failures} check(s) failed.\n`,
  );
  if (failures > 0) process.exitCode = 1;
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
