/**
 * Screenshots the main screens at desktop and phone widths, so the finish can
 * actually be looked at rather than assumed. Writes into `.verify/`.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const OUT = path.resolve(process.cwd(), ".verify");
const prisma = new PrismaClient();

async function main() {
  await mkdir(OUT, { recursive: true });

  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "coordinator@viacame.org" },
  });
  const token = await new SignJWT({ sub: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET));

  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  const monthQuery = `period=month&year=${d.getFullYear()}&month=${d.getMonth() + 1}`;

  const shots: [string, string, { width: number; height: number }][] = [
    ["sign-in", "/sign-in", { width: 1440, height: 900 }],
    ["dashboard", `/dashboard?${monthQuery}`, { width: 1440, height: 1000 }],
    ["sessions", "/sessions?period=all", { width: 1440, height: 1000 }],
    ["session-form", "/sessions/new", { width: 1440, height: 1000 }],
    ["session-form-mobile", "/sessions/new", { width: 390, height: 844 }],
    ["dashboard-mobile", `/dashboard?${monthQuery}`, { width: 390, height: 844 }],
    ["reports", "/reports", { width: 1440, height: 1000 }],
    ["report-builder", `/reports/build?${monthQuery}`, { width: 1600, height: 1100 }],
    ["data-export", "/data?period=all", { width: 1440, height: 1000 }],
    ["settings", "/settings", { width: 1440, height: 1000 }],
  ];

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    await browser.setCookie({
      name: "viac_session",
      value: token,
      domain: "localhost",
      path: "/",
    });
    for (const [name, route, viewport] of shots) {
      const page = await browser.newPage();
      await page.setViewport({ ...viewport, deviceScaleFactor: 2 });
      await page.goto(BASE + route, { waitUntil: "networkidle0", timeout: 60_000 });

      // A `fullPage` capture resizes the viewport, and Recharts re-measures
      // mid-capture — which renders every chart at the wrong width. Grow the
      // viewport first, let the charts settle, then shoot the viewport itself.
      const docHeight = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      await page.setViewport({
        ...viewport,
        height: Math.min(docHeight + 40, 8000),
        deviceScaleFactor: 2,
      });
      await new Promise((r) => setTimeout(r, 1200));

      const file = path.join(OUT, `screen-${name}.png`);
      await page.screenshot({ path: file as `${string}.png` });
      console.log(`  ${name.padEnd(22)} ${viewport.width}×${viewport.height}  ${file}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
