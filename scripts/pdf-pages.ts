/**
 * Renders each page of `.verify/export.pdf` to a PNG so the printed layout can
 * actually be looked at — specifically, that the letterhead bands repeat on
 * every page rather than only the first.
 *
 * pdf.js is injected inline (a file:// module import is blocked in the page),
 * and its worker is handed over as a blob URL.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer";

const OUT = path.resolve(process.cwd(), ".verify");
const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";

async function main() {
  await mkdir(OUT, { recursive: true });
  const pdf = await readFile(path.join(OUT, "export.pdf"));
  const pdfjsSource = await readFile(
    path.resolve(process.cwd(), "node_modules/pdfjs-dist/build/pdf.min.mjs"),
    "utf8",
  );
  const workerSource = await readFile(
    path.resolve(process.cwd(), "node_modules/pdfjs-dist/build/pdf.worker.min.mjs"),
    "utf8",
  );

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    page.on("pageerror", (e) => console.log("   [page error]", String(e)));
    await page.setViewport({ width: 900, height: 1200 });
    // A real http origin, so blob: workers are allowed.
    await page.goto(`${BASE}/sign-in`, { waitUntil: "domcontentloaded" });

    await page.addScriptTag({
      type: "module",
      content: `${pdfjsSource}\nwindow.__pdfjs = { getDocument, GlobalWorkerOptions };`,
    });
    await page.waitForFunction("window.__pdfjs !== undefined", { timeout: 20_000 });

    const images: string[] = await page.evaluate(
      async (workerSrc, bytes) => {
        const { getDocument, GlobalWorkerOptions } = (
          window as unknown as {
            __pdfjs: {
              getDocument: (o: unknown) => { promise: Promise<PdfDoc> };
              GlobalWorkerOptions: { workerSrc: string };
            };
          }
        ).__pdfjs;

        type PdfDoc = {
          numPages: number;
          getPage: (n: number) => Promise<{
            getViewport: (o: { scale: number }) => {
              width: number;
              height: number;
            };
            render: (o: unknown) => { promise: Promise<void> };
          }>;
        };

        GlobalWorkerOptions.workerSrc = URL.createObjectURL(
          new Blob([workerSrc], { type: "text/javascript" }),
        );

        const doc = await getDocument({ data: new Uint8Array(bytes) }).promise;
        const out: string[] = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const p = await doc.getPage(i);
          const viewport = p.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext("2d")!;
          context.fillStyle = "#fff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          await p.render({ canvas, canvasContext: context, viewport }).promise;
          out.push(canvas.toDataURL("image/png"));
        }
        return out;
      },
      workerSource,
      Array.from(pdf),
    );

    for (const [i, dataUrl] of images.entries()) {
      const file = path.join(OUT, `pdf-page-${i + 1}.png`);
      await writeFile(file, Buffer.from(dataUrl.split(",")[1], "base64"));
      console.log(`  wrote ${file}`);
    }
    console.log(`\n  ${images.length} page(s) rendered.`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
