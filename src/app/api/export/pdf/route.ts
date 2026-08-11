import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveReport } from "@/lib/resolve-report";
import { renderPdf } from "@/lib/exports/pdf";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", request.url));

  const url = new URL(request.url);
  const { slug, title, scope } = await resolveReport(url.searchParams, user);

  const printUrl = new URL("/print/report", url.origin);
  printUrl.search = url.search;

  try {
    const pdf = await renderPdf({
      url: printUrl.toString(),
      cookie: request.headers.get("cookie") ?? "",
    });

    const fileName = `${slug}.pdf`;
    await db.report.create({
      data: {
        scope: scope as object,
        title,
        format: "PDF",
        fileName,
        generatedById: user.id,
      },
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${fileName}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF export failed", error);

    // Serverless hosts (Netlify Functions, Vercel) ship no Chrome binary and
    // cap the function bundle well below Chromium's size, so this path is
    // expected to fail there. Say so plainly and point at the two exports that
    // are pure JavaScript and work anywhere.
    if (isBrowserMissing(error)) {
      return NextResponse.json(
        {
          error:
            "PDF export needs a Chrome binary, which this host does not provide. " +
            "The Word (.docx) export carries the same letterhead and content, " +
            "and the Excel export is unaffected.",
          alternatives: {
            word: `/api/export/docx${url.search}`,
            excel: `/api/export/excel${url.search}`,
          },
        },
        { status: 501 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Could not render the PDF. If this is the first run, Puppeteer may still be downloading Chrome — try again in a moment.",
      },
      { status: 500 },
    );
  }
}

/** Chrome absent (serverless) rather than a genuine rendering failure. */
function isBrowserMissing(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /Could not find Chrome|Failed to launch|executablePath|ENOENT|spawn/i.test(
      message,
    ) || /Cannot find module ['"]puppeteer/i.test(message)
  );
}
