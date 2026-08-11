/**
 * One source of truth for the printed page.
 *
 * The letterhead band heights are derived from the PNGs' own aspect ratios, so
 * the artwork is never stretched, and the page margins are sized to hold them.
 * The print CSS, the PDF's margin boxes and the Word section all read these.
 */

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

/** Side margins. The workbook's letterhead template uses 1"; 18mm reads better
 *  with this type size and keeps the banner from dominating the page. */
export const MARGIN_MM = 18;
export const CONTENT_MM = A4_WIDTH_MM - MARGIN_MM * 2;

/** viac_header.png is 1390×310, viac_footer.png is 1389×195. */
export const HEADER_ASPECT = 310 / 1390;
export const FOOTER_ASPECT = 195 / 1389;

const round = (mm: number) => Math.round(mm * 10) / 10;

export const HEADER_MM = round(CONTENT_MM * HEADER_ASPECT);
export const FOOTER_MM = round(CONTENT_MM * FOOTER_ASPECT);

/** Clear space between a band and the body text. */
export const GAP_MM = 9;

/**
 * Paper-edge clearance. The letterhead bands sit in the page flow as a table
 * header/footer group rather than in the page margins, so the @page margin only
 * has to keep the artwork off the very edge of the sheet.
 */
export const EDGE_MM = 8;

/** Total vertical space a band claims on each page, artwork plus its gap. */
export const PAGE_TOP_MM = round(EDGE_MM + HEADER_MM + GAP_MM);
export const PAGE_BOTTOM_MM = round(EDGE_MM + FOOTER_MM + GAP_MM);

export const mm = (value: number) => `${value}mm`;
