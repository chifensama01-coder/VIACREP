"use client";

import * as React from "react";
import { Printer } from "lucide-react";

/**
 * The browser-print path to a PDF.
 *
 * `/print/report` is the finished document — letterhead, page breaks and all —
 * so "Save as PDF" from the browser's print dialog produces exactly what the
 * server-side renderer would. That makes PDF export work on hosts that ship no
 * Chrome binary, which is every serverless platform.
 *
 * `?print=1` opens the dialog straight away, so a link can go from the report
 * builder to a save dialog in one click.
 */
export function PrintControls({ auto }: { auto: boolean }) {
  React.useEffect(() => {
    if (!auto) return;
    let cancelled = false;

    // Fonts and the letterhead PNGs must be painted before the dialog opens, or
    // the preview measures the wrong page count.
    const ready = Promise.all([
      document.fonts?.ready ?? Promise.resolve(),
      ...Array.from(document.images)
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise<void>((resolve) => {
              img.addEventListener("load", () => resolve(), { once: true });
              img.addEventListener("error", () => resolve(), { once: true });
            }),
        ),
    ]);

    ready.then(() => {
      if (!cancelled) requestAnimationFrame(() => window.print());
    });

    return () => {
      cancelled = true;
    };
  }, [auto]);

  return (
    <div className="no-print viac-print-bar">
      <button type="button" onClick={() => window.print()}>
        <Printer size={16} aria-hidden />
        Save as PDF
      </button>
      <span>Choose “Save as PDF” as the destination, and leave margins at Default.</span>
    </div>
  );
}
