import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { resolveReport } from "@/lib/resolve-report";
import {
  LetterheadDocument,
  LetterheadStyles,
} from "@/components/report/letterhead";
import { PrintControls } from "./print-controls";

/**
 * The finished document, and the only place it is laid out.
 *
 * Three things render from this one page: the live preview in the report
 * builder, the server-side PDF (Puppeteer prints this URL), and a browser
 * "Save as PDF" — which is how deployed instances produce a PDF, since
 * serverless functions ship no Chrome.
 *
 * It carries no app chrome and no stylesheet dependency — everything it needs
 * is inlined by `LetterheadStyles`, so the PDF looks the same whether the app
 * CSS loaded or not.
 */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Report",
  other: {
    // Stop Chrome turning community and division names into tel/address links.
    "format-detection": "telephone=no, date=no, address=no, email=no",
  },
};

export default async function PrintReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const params = await searchParams;
  const { doc } = await resolveReport(params, user);
  const auto = params.print === "1";

  return (
    <>
      <LetterheadStyles />
      <style
        dangerouslySetInnerHTML={{
          __html: `
html, body { margin: 0; padding: 0; background: #fff; }

/* On screen the route reads as one continuous page, letterhead and all. In
   print the bands become fixed and repeat per page (see LetterheadStyles). */
@media screen {
  body { background: #F1F2F4; }
  .viac-doc {
    max-width: 174mm;
    margin: 24px auto 40px;
    background: #fff;
    padding: 0 18mm;
    box-shadow: 0 2px 4px rgba(20,28,36,.05), 0 12px 28px -6px rgba(20,28,36,.12);
  }
  .viac-page { padding: 8mm 0 12mm; }
}

.viac-print-bar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: #2A2A2A;
  color: #DBDDDE;
  font: 500 13px Inter, "Segoe UI", system-ui, sans-serif;
}
.viac-print-bar button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 10px;
  padding: 9px 14px;
  background: #118AB9;
  color: #fff;
  font: 600 13px Inter, "Segoe UI", system-ui, sans-serif;
  cursor: pointer;
  transition: background-color .15s;
}
.viac-print-bar button:hover { background: #116E92; }

@media print { .no-print { display: none !important; } }
`,
        }}
      />
      <PrintControls auto={auto} />
      <LetterheadDocument doc={doc} />
    </>
  );
}
