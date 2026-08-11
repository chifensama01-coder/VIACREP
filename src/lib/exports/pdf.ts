import "server-only";

import puppeteer, { type Browser } from "puppeteer";

/**
 * HTML → PDF, server-side.
 *
 * The body *and the letterhead* both come from `/print/report`, the very page
 * the report builder shows as a live preview. The bands repeat via fixed
 * positioning into the @page margins (see `components/report/letterhead.tsx`),
 * so nothing here has to inject artwork: `preferCSSPageSize` hands Chromium the
 * page size and margins the stylesheet already declares.
 *
 * That also means this renderer is a convenience, not a dependency. Printing
 * the same URL from a browser produces the identical document, which is what
 * serverless deployments do — they ship no Chrome binary.
 */

let browserPromise: Promise<Browser> | null = null;

const LAUNCH = {
  headless: true as const,
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
};

async function getBrowser() {
  if (browserPromise) {
    try {
      const existing = await browserPromise;
      if (existing.connected) return existing;
    } catch {
      // fall through and relaunch
    }
  }
  browserPromise = puppeteer.launch(LAUNCH);
  return browserPromise;
}

export async function renderPdf({
  url,
  cookie,
}: {
  url: string;
  /** The caller's session cookie — the print page is behind auth. */
  cookie: string;
}): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    const target = new URL(url);
    if (cookie) {
      await browser.setCookie(
        ...cookie
          .split(";")
          .map((part) => part.trim())
          .filter(Boolean)
          .map((part) => {
            const index = part.indexOf("=");
            return {
              name: part.slice(0, index),
              value: part.slice(index + 1),
              domain: target.hostname,
              path: "/",
            };
          }),
      );
    }

    await page.goto(url, { waitUntil: "networkidle0", timeout: 60_000 });
    // Web fonts and the letterhead PNGs must be decoded before we print.
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images)
          .filter((img) => !img.complete)
          .map(
            (img) =>
              new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve;
              }),
          ),
      );
    });

    const pdf = await page.pdf({
      printBackground: true,
      // Take the page size and margins from the stylesheet's @page rule, so the
      // letterhead geometry is defined in exactly one place.
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => {});
  }
}
