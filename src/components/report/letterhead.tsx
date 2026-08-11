import * as React from "react";
import type { ReportBlock, ReportDocument } from "@/lib/report";

/**
 * The letterhead document.
 *
 * The same component renders the on-screen preview and the page Puppeteer
 * prints, so what staff approve is exactly what comes out as a PDF. The header
 * and footer bands are `position: fixed`, which Chromium repeats on every
 * printed page — the letterhead therefore appears on page 1 and page 9 alike.
 *
 * Everything is inline-styled and self-contained: the print page must not
 * depend on the app's stylesheet being loaded when Chrome renders it.
 */

import { EDGE_MM, GAP_MM, MARGIN_MM } from "@/lib/letterhead-geometry";

const INK = "#2A2A2A";
const MUTED = "#64686A";
const BLUE = "#118AB9";
const BLUE_DEEP = "#13546D";
const GOLD = "#DDA328";
const HAIRLINE = "#DBDDDE";

export function LetterheadStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
@page {
  size: A4;
  /* The bands live in the page flow (see .viac-sheet below), not in the page
     margins, so the margin only needs to hold the paper's edge clearance. */
  margin: ${EDGE_MM}mm ${MARGIN_MM}mm ${EDGE_MM}mm ${MARGIN_MM}mm;
}

.viac-doc {
  font-family: Inter, "Segoe UI", system-ui, sans-serif;
  color: ${INK};
  font-size: 10.5pt;
  line-height: 1.55;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

/*
 * How the letterhead repeats on every printed page.
 *
 * The whole document is one table: the header band is its THEAD, the body its
 * TBODY, the footer band its TFOOT. A table header group repeats at the top of
 * every page fragment and a footer group at the bottom — that is the one
 * mechanism CSS gives you for repeating artwork, and it works identically in
 * the browser's own "Save as PDF" and in Puppeteer.
 *
 * Two approaches were tried and rejected. Chromium's headerTemplate /
 * footerTemplate margin boxes work, but only for Puppeteer, so a deployment
 * with no Chrome binary loses its letterhead. Fixed-position bands are worse:
 * Chromium lays them out against the document rather than each page and paints
 * them straight through the body text (verified — see .verify/pdf-page-*.png).
 */
.viac-sheet { width: 100%; border-collapse: collapse; }
.viac-sheet > thead { display: table-header-group; }
.viac-sheet > tfoot { display: table-footer-group; }
.viac-sheet > thead > tr > td,
.viac-sheet > tbody > tr > td,
.viac-sheet > tfoot > tr > td { padding: 0; border: 0; vertical-align: top; }

.viac-band img { display: block; width: 100%; height: auto; }
.viac-band--header { padding-bottom: ${GAP_MM}mm; }
.viac-band--footer { padding-top: ${GAP_MM}mm; }

.viac-page { padding-top: 0; }

/* Chrome auto-detects some place names as addresses and paints them as links.
   Nothing in this document is a link, so neutralise them. */
.viac-doc a { color: inherit !important; text-decoration: none !important; }

/* Sections may flow across pages — pinning whole sections leaves half-empty
   pages. What must not break is a heading away from its content, a table row,
   or the stat grid. */
.viac-section { margin-top: 16px; }
.viac-section h2 {
  break-after: avoid-page;
  font-size: 11pt;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${BLUE_DEEP};
  margin: 0 0 7px;
  padding-bottom: 5px;
  border-bottom: 1.5px solid ${GOLD};
}
.viac-section p { margin: 0 0 8px; orphans: 2; widows: 2; }
/* The root layout's Tailwind preflight resets lists to \`list-style: none\`, which
   silently swallowed the bullets on every narrative section. Restore them
   explicitly rather than relying on the UA default. */
.viac-section ul { margin: 4px 0 8px; padding-left: 18px; list-style: disc outside; }
.viac-section li { display: list-item; margin-bottom: 4px; padding-left: 2px; }
.viac-section li::marker { color: ${BLUE}; }

.viac-table { width: 100%; border-collapse: collapse; margin: 6px 0 4px; font-size: 9.5pt; }
.viac-table th {
  background: #F4F6F9;
  color: ${MUTED};
  font-size: 8pt;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-align: left;
  padding: 6px 8px;
  border-bottom: 1px solid ${HAIRLINE};
}
.viac-table td { padding: 5px 8px; border-bottom: 1px solid #EEF0F2; }
.viac-table tr:last-child td { border-bottom: none; }
.viac-table .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.viac-table tfoot td {
  font-weight: 700;
  border-top: 1.5px solid ${INK};
  background: #FAFBFC;
}
/* Column headings repeat when a table spans pages … */
.viac-table thead { display: table-header-group; }
/* … but the Total row must not: a real tfoot repeats on every fragment, which
   would print a running "Total" halfway down the table. */
.viac-table tfoot { display: table-row-group; }
.viac-table tr { break-inside: avoid; }

.viac-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin: 6px 0 4px;
  break-inside: avoid;
}
.viac-stat {
  border: 1px solid ${HAIRLINE};
  border-left: 3px solid ${BLUE};
  border-radius: 4px;
  padding: 8px 10px;
}
.viac-stat .label {
  font-size: 7.5pt;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${MUTED};
  margin: 0 0 2px;
}
.viac-stat .value {
  font-size: 16pt;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
  margin: 0;
  font-variant-numeric: tabular-nums;
}
.viac-stat .note { font-size: 8pt; color: ${GOLD}; font-weight: 600; margin: 1px 0 0; }

.viac-signature { break-inside: avoid-page; margin-top: 26px; padding-top: 14px; border-top: 1px solid ${HAIRLINE}; }
.viac-signature .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
.viac-signature .rule { border-bottom: 1px solid ${INK}; height: 26px; margin-bottom: 5px; }
.viac-signature .role { font-size: 8pt; letter-spacing: 0.06em; text-transform: uppercase; color: ${MUTED}; margin: 0 0 8px; }
.viac-signature .name { font-weight: 600; margin: 0; font-size: 10pt; }
.viac-signature .desig { color: ${MUTED}; font-size: 9pt; margin: 1px 0 0; }
`,
      }}
    />
  );
}

export function LetterheadDocument({ doc }: { doc: ReportDocument }) {
  return (
    <div className="viac-doc">
      {/*
        A table, so the letterhead repeats: a THEAD is a table header group,
        which every paged-media engine reprints at the top of each page, and a
        TFOOT does the same at the bottom. The body is a single cell that
        fragments across pages between them.
      */}
      <table className="viac-sheet">
        <thead>
          <tr>
            <td>
              <div className="viac-band viac-band--header">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={doc.headerImageUrl} alt={doc.organizationName} />
              </div>
            </td>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>
              <div className="viac-page">
                <ReportTitleBlock doc={doc} />
                {doc.sections.map((section) => (
                  <section key={section.number} className="viac-section">
                    <h2>
                      {section.number}. {section.title}
                    </h2>
                    {section.blocks.map((block, i) => (
                      <Block key={i} block={block} />
                    ))}
                  </section>
                ))}
                <SignatureBlock doc={doc} />
              </div>
            </td>
          </tr>
        </tbody>

        <tfoot>
          <tr>
            <td>
              <div className="viac-band viac-band--footer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={doc.footerImageUrl} alt="" />
              </div>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function ReportTitleBlock({ doc }: { doc: ReportDocument }) {
  return (
    <header style={{ textAlign: "center", marginBottom: 4 }}>
      <p
        style={{
          margin: 0,
          fontSize: "9pt",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: MUTED,
          fontWeight: 600,
        }}
      >
        {doc.documentTitle}
      </p>
      <h1
        style={{
          margin: "4px 0 0",
          fontSize: "17pt",
          fontWeight: 700,
          letterSpacing: "-0.01em",
          color: INK,
        }}
      >
        {doc.reportTitle}
      </h1>
      <div
        style={{
          margin: "10px auto 0",
          display: "inline-block",
          borderTop: `2px solid ${GOLD}`,
          borderBottom: `1px solid ${HAIRLINE}`,
          padding: "6px 18px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "7.5pt",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: MUTED,
          }}
        >
          Reporting period
        </p>
        <p
          style={{
            margin: "1px 0 0",
            fontSize: "12pt",
            fontWeight: 700,
            color: BLUE_DEEP,
          }}
        >
          {doc.periodLabel}
        </p>
        {doc.scopeLine && (
          <p style={{ margin: "2px 0 0", fontSize: "9pt", color: GOLD, fontWeight: 600 }}>
            {doc.scopeLine}
          </p>
        )}
      </div>
    </header>
  );
}

function Block({ block }: { block: ReportBlock }) {
  switch (block.type) {
    case "paragraph":
      return <p>{block.text}</p>;

    case "bullets":
      if (block.items.length === 0) {
        return (
          <p style={{ color: MUTED, fontStyle: "italic" }}>
            Not yet written for this period.
          </p>
        );
      }
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );

    case "stats":
      return (
        <div className="viac-stats">
          {block.items.map((item) => (
            <div key={item.label} className="viac-stat">
              <p className="label">{item.label}</p>
              <p className="value">{item.value}</p>
              {item.note && <p className="note">{item.note}</p>}
            </div>
          ))}
        </div>
      );

    case "table":
      if (block.rows.length === 0) {
        return (
          <p style={{ color: MUTED, fontStyle: "italic" }}>
            No data recorded for this period.
          </p>
        );
      }
      return (
        <table className="viac-table">
          <thead>
            <tr>
              {block.head.map((label, i) => (
                <th key={label} className={block.numeric?.includes(i) ? "num" : ""}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => (
                  <td key={c} className={block.numeric?.includes(c) ? "num" : ""}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {block.total && (
            <tfoot>
              <tr>
                {block.total.map((cell, c) => (
                  <td key={c} className={block.numeric?.includes(c) ? "num" : ""}>
                    {cell}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      );
  }
}

function SignatureBlock({ doc }: { doc: ReportDocument }) {
  const { signature } = doc;
  return (
    <div className="viac-signature">
      <div className="grid">
        <div>
          <p className="role">Prepared by</p>
          <div className="rule" />
          <p className="name">{signature.preparedBy || " "}</p>
          <p className="desig">{signature.preparedDesignation || " "}</p>
          <p className="desig">Date: {signature.date}</p>
        </div>
        <div>
          <p className="role">Approved by</p>
          <div className="rule" />
          <p className="name">{signature.approvedBy || " "}</p>
          <p className="desig">{signature.approvedDesignation || " "}</p>
          <p className="desig">Date: {signature.date}</p>
        </div>
      </div>
    </div>
  );
}

