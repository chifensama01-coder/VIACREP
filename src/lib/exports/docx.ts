import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertMillimetersToTwip,
} from "docx";
import type { ReportBlock, ReportDocument } from "@/lib/report";

/**
 * Word (.docx) on the VIAC letterhead.
 *
 * The header and footer are real Word section headers holding the letterhead
 * PNGs, so they repeat on every page and survive editing — VIAC can open the
 * file, adjust a sentence and send it on without the branding coming apart.
 */

const INK = "2A2A2A";
const MUTED = "64686A";
const BLUE_DEEP = "13546D";
const GOLD = "DDA328";
const HAIRLINE = "DBDDDE";
const HEAD_FILL = "F4F6F9";

/* A4 with 1" side margins, matching VIAC_LETTERHEAD_AND_FOOTER_TEMPLATE.docx. */
const PAGE_WIDTH_MM = 210;
const SIDE_MARGIN_MM = 20;
const CONTENT_WIDTH_MM = PAGE_WIDTH_MM - SIDE_MARGIN_MM * 2;
const CONTENT_WIDTH_DXA = convertMillimetersToTwip(CONTENT_WIDTH_MM);

/** Letterhead PNG intrinsic sizes, used to keep the aspect ratio exact. */
const HEADER_ASPECT = 310 / 1390;
const FOOTER_ASPECT = 195 / 1389;

const mmToPt = (mm: number) => (mm * 72) / 25.4;

async function letterheadImages() {
  const dir = path.join(process.cwd(), "public", "letterhead");
  const [header, footer] = await Promise.all([
    readFile(path.join(dir, "viac_header.png")),
    readFile(path.join(dir, "viac_footer.png")),
  ]);
  return { header, footer };
}

export async function renderDocx(doc: ReportDocument): Promise<Buffer> {
  const images = await letterheadImages();
  const bandWidthPt = mmToPt(CONTENT_WIDTH_MM);

  const children: (Paragraph | Table)[] = [
    ...titleBlock(doc),
    ...doc.sections.flatMap((section) => [
      sectionHeading(section.number, section.title),
      ...section.blocks.flatMap(renderBlock),
    ]),
    ...signatureBlock(doc),
  ];

  const document = new Document({
    creator: doc.organizationName,
    title: `${doc.reportTitle} — ${doc.periodLabel}`,
    description: doc.documentTitle,
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 21, color: INK }, // 10.5pt
          paragraph: { spacing: { line: 276, after: 120 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: {
              top: convertMillimetersToTwip(30),
              right: convertMillimetersToTwip(SIDE_MARGIN_MM),
              bottom: convertMillimetersToTwip(26),
              left: convertMillimetersToTwip(SIDE_MARGIN_MM),
              header: convertMillimetersToTwip(8),
              footer: convertMillimetersToTwip(8),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 0 },
                children: [
                  new ImageRun({
                    type: "png",
                    data: images.header,
                    transformation: {
                      width: bandWidthPt,
                      height: bandWidthPt * HEADER_ASPECT,
                    },
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new ImageRun({
                    type: "png",
                    data: images.footer,
                    transformation: {
                      width: bandWidthPt,
                      height: bandWidthPt * FOOTER_ASPECT,
                    },
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}

/* -------------------------------------------------------------------------- */

function titleBlock(doc: ReportDocument): Paragraph[] {
  const out = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: doc.documentTitle.toUpperCase(),
          bold: true,
          size: 17,
          color: MUTED,
          characterSpacing: 30,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({ text: doc.reportTitle, bold: true, size: 32, color: INK }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 20 },
      border: { top: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 6 } },
      children: [
        new TextRun({
          text: "REPORTING PERIOD",
          size: 15,
          color: MUTED,
          characterSpacing: 24,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: doc.scopeLine ? 20 : 240 },
      border: doc.scopeLine
        ? undefined
        : { bottom: { style: BorderStyle.SINGLE, size: 6, color: HAIRLINE, space: 8 } },
      children: [
        new TextRun({
          text: doc.periodLabel,
          bold: true,
          size: 24,
          color: BLUE_DEEP,
        }),
      ],
    }),
  ];

  if (doc.scopeLine) {
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: HAIRLINE, space: 8 },
        },
        children: [
          new TextRun({ text: doc.scopeLine, bold: true, size: 19, color: GOLD }),
        ],
      }),
    );
  }
  return out;
}

function sectionHeading(number: number, title: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 100 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 10, color: GOLD, space: 4 },
    },
    children: [
      new TextRun({
        text: `${number}. ${title.toUpperCase()}`,
        bold: true,
        size: 22,
        color: BLUE_DEEP,
        characterSpacing: 10,
      }),
    ],
  });
}

function renderBlock(block: ReportBlock): (Paragraph | Table)[] {
  switch (block.type) {
    case "paragraph":
      return [
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 140 },
          children: [new TextRun(block.text)],
        }),
      ];

    case "bullets":
      if (block.items.length === 0) {
        return [
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: "Not yet written for this period.",
                italics: true,
                color: MUTED,
              }),
            ],
          }),
        ];
      }
      return block.items.map(
        (item) =>
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 60 },
            children: [new TextRun(item)],
          }),
      );

    case "stats":
      return [
        statsTable(block.items),
        new Paragraph({ spacing: { after: 80 }, children: [] }),
      ];

    case "table": {
      if (block.rows.length === 0) {
        return [
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: "No data recorded for this period.",
                italics: true,
                color: MUTED,
              }),
            ],
          }),
        ];
      }
      return [
        dataTable(block),
        new Paragraph({ spacing: { after: 80 }, children: [] }),
      ];
    }
  }
}

function statsTable(items: { label: string; value: string; note?: string }[]) {
  const columns = 3;
  const rows: TableRow[] = [];

  for (let i = 0; i < items.length; i += columns) {
    const slice = items.slice(i, i + columns);
    rows.push(
      new TableRow({
        children: Array.from({ length: columns }, (_, c) => {
          const item = slice[c];
          return new TableCell({
            width: { size: Math.floor(CONTENT_WIDTH_DXA / columns), type: WidthType.DXA },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            borders: cellBorders(),
            children: item
              ? [
                  new Paragraph({
                    spacing: { after: 20 },
                    children: [
                      new TextRun({
                        text: item.label.toUpperCase(),
                        size: 14,
                        color: MUTED,
                        characterSpacing: 12,
                      }),
                    ],
                  }),
                  new Paragraph({
                    spacing: { after: 0 },
                    children: [
                      new TextRun({ text: item.value, bold: true, size: 28, color: INK }),
                      ...(item.note
                        ? [
                            new TextRun({
                              text: `  ${item.note}`,
                              bold: true,
                              size: 16,
                              color: GOLD,
                            }),
                          ]
                        : []),
                    ],
                  }),
                ]
              : [new Paragraph({ children: [] })],
          });
        }),
      }),
    );
  }

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    rows,
  });
}

function dataTable(block: Extract<ReportBlock, { type: "table" }>) {
  const columnCount = block.head.length;
  const numeric = new Set(block.numeric ?? []);
  // Give the first (label) column the slack; numeric columns stay narrow.
  const narrow = Math.floor(CONTENT_WIDTH_DXA * 0.14);
  const wide = CONTENT_WIDTH_DXA - narrow * (columnCount - 1);
  const widthFor = (i: number) => (i === 0 ? wide : narrow);

  const headRow = new TableRow({
    tableHeader: true,
    children: block.head.map(
      (label, i) =>
        new TableCell({
          width: { size: widthFor(i), type: WidthType.DXA },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          shading: { type: ShadingType.CLEAR, fill: HEAD_FILL },
          borders: cellBorders(),
          verticalAlign: VerticalAlign.CENTER,
          children: [
            new Paragraph({
              alignment: numeric.has(i) ? AlignmentType.RIGHT : AlignmentType.LEFT,
              spacing: { after: 0 },
              children: [
                new TextRun({
                  text: label.toUpperCase(),
                  bold: true,
                  size: 14,
                  color: MUTED,
                  characterSpacing: 12,
                }),
              ],
            }),
          ],
        }),
    ),
  });

  const bodyRows = block.rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell, i) =>
            new TableCell({
              width: { size: widthFor(i), type: WidthType.DXA },
              margins: { top: 70, bottom: 70, left: 120, right: 120 },
              borders: cellBorders(),
              children: [
                new Paragraph({
                  alignment: numeric.has(i) ? AlignmentType.RIGHT : AlignmentType.LEFT,
                  spacing: { after: 0 },
                  children: [new TextRun({ text: cell, size: 19 })],
                }),
              ],
            }),
        ),
      }),
  );

  const rows = [headRow, ...bodyRows];

  if (block.total) {
    rows.push(
      new TableRow({
        children: block.total.map(
          (cell, i) =>
            new TableCell({
              width: { size: widthFor(i), type: WidthType.DXA },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              shading: { type: ShadingType.CLEAR, fill: "FAFBFC" },
              borders: {
                ...cellBorders(),
                top: { style: BorderStyle.SINGLE, size: 10, color: INK },
              },
              children: [
                new Paragraph({
                  alignment: numeric.has(i) ? AlignmentType.RIGHT : AlignmentType.LEFT,
                  spacing: { after: 0 },
                  children: [new TextRun({ text: cell, bold: true, size: 19 })],
                }),
              ],
            }),
        ),
      }),
    );
  }

  return new Table({
    width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
    rows,
  });
}

function cellBorders() {
  const line = { style: BorderStyle.SINGLE, size: 2, color: HAIRLINE } as const;
  return { top: line, bottom: line, left: line, right: line };
}

function signatureBlock(doc: ReportDocument): (Paragraph | Table)[] {
  const { signature } = doc;

  const column = (
    role: string,
    name: string,
    designation: string,
  ): (Paragraph | Table)[] => [
    new Paragraph({
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: role.toUpperCase(),
          size: 14,
          color: MUTED,
          characterSpacing: 12,
        }),
      ],
    }),
    new Paragraph({
      spacing: { before: 360, after: 40 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: INK, space: 2 } },
      children: [],
    }),
    new Paragraph({
      spacing: { after: 0 },
      children: [new TextRun({ text: name || " ", bold: true, size: 20 })],
    }),
    new Paragraph({
      spacing: { after: 0 },
      children: [
        new TextRun({ text: designation || " ", size: 18, color: MUTED }),
      ],
    }),
    new Paragraph({
      spacing: { after: 0 },
      children: [
        new TextRun({ text: `Date: ${signature.date}`, size: 18, color: MUTED }),
      ],
    }),
  ];

  return [
    new Paragraph({
      spacing: { before: 400, after: 160 },
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: HAIRLINE, space: 8 } },
      children: [],
    }),
    new Table({
      width: { size: CONTENT_WIDTH_DXA, type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: CONTENT_WIDTH_DXA / 2, type: WidthType.DXA },
              margins: { right: 400 },
              borders: noBorders(),
              children: column(
                "Prepared by",
                signature.preparedBy,
                signature.preparedDesignation,
              ) as Paragraph[],
            }),
            new TableCell({
              width: { size: CONTENT_WIDTH_DXA / 2, type: WidthType.DXA },
              margins: { left: 400 },
              borders: noBorders(),
              children: column(
                "Approved by",
                signature.approvedBy,
                signature.approvedDesignation,
              ) as Paragraph[],
            }),
          ],
        }),
      ],
    }),
  ];
}

function noBorders() {
  const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
  return { top: none, bottom: none, left: none, right: none };
}
