import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { aggregate } from "@/lib/aggregate";
import { describeScope } from "@/lib/narrative";
import { renderWorkbook } from "@/lib/exports/excel";
import { periodKey, periodLabel, scopeFromSearchParams } from "@/lib/scope";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/sign-in", request.url));

  const url = new URL(request.url);
  const scope = scopeFromSearchParams(url.searchParams);

  try {
    const [data, filterLabels] = await Promise.all([
      aggregate(scope, user, { withPrevious: false }),
      describeScope(scope),
    ]);

    const buffer = await renderWorkbook({
      data,
      scopeLabel: periodLabel(scope.period),
      filterLabels,
      generatedBy: user.name,
    });

    const fileName = `VIAC_Data_${periodKey(scope.period).replace(/\.\./g, "_to_")}.xlsx`
      .replace(/[^\w.-]+/g, "-");

    await db.report.create({
      data: {
        scope: scope as object,
        title: `Data export — ${periodLabel(scope.period)}`,
        format: "XLSX",
        fileName,
        generatedById: user.id,
      },
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${fileName}"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    console.error("Excel export failed", error);
    return NextResponse.json(
      { error: "Could not build the workbook." },
      { status: 500 },
    );
  }
}
