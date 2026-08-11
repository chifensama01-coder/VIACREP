import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveReport } from "@/lib/resolve-report";
import { renderDocx } from "@/lib/exports/docx";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", request.url));

  const url = new URL(request.url);
  const { doc, slug, title, scope } = await resolveReport(url.searchParams, user);

  try {
    const buffer = await renderDocx(doc);
    const fileName = `${slug}.docx`;

    await db.report.create({
      data: {
        scope: scope as object,
        title,
        format: "DOCX",
        fileName,
        generatedById: user.id,
      },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "content-disposition": `attachment; filename="${fileName}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("DOCX export failed", error);
    return NextResponse.json(
      { error: "Could not build the Word document." },
      { status: 500 },
    );
  }
}
