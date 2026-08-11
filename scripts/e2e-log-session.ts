/**
 * Drives the real entry form in a browser: search for a community, watch the
 * division auto-fill, type counts, submit, and confirm the row landed in the
 * database with the right total. Then deletes it again.
 */
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";
import puppeteer from "puppeteer";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const prisma = new PrismaClient();

let failures = 0;
function assert(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}${detail ? `  — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "coordinator@viacame.org" },
  });
  const token = await new SignJWT({ sub: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(process.env.AUTH_SECRET));

  const before = await prisma.session.count();

  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  let createdId: string | null = null;

  try {
    await browser.setCookie({
      name: "viac_session",
      value: token,
      domain: "localhost",
      path: "/",
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1000 });
    await page.goto(`${BASE}/sessions/new`, { waitUntil: "networkidle0" });

    // --- community combobox: open, search, choose ---------------------------
    await page.click("#community");
    await page.waitForSelector('input[placeholder="Type a community name…"]', {
      timeout: 5000,
    });
    await page.type('input[placeholder="Type a community name…"]', "Molyko", {
      delay: 20,
    });
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    const optionCount = await page.$$eval('[role="option"]', (els) => els.length);
    assert("combobox filters as you type", optionCount >= 1, `${optionCount} match(es)`);
    await page.click('[role="option"]');

    await new Promise((r) => setTimeout(r, 300));
    const selected = await page.$eval("#community", (el) => el.textContent ?? "");
    assert("community selected", selected.includes("Molyko"), selected.trim());

    // The workbook's INDEX/MATCH, done live.
    const autoFilled = await page.evaluate(() =>
      Array.from(document.querySelectorAll("div")).some((d) =>
        /Fako - Buea/.test(d.textContent ?? ""),
      ),
    );
    assert("division – subdivision auto-filled", autoFilled, "Fako - Buea");

    // --- counts, and the live total ----------------------------------------
    const inputs = await page.$$('input[type="number"]');
    assert("count matrix rendered", inputs.length >= 12, `${inputs.length} cells`);
    // Sex Workers male (0) and female (1); General men/women are the last pair.
    await inputs[0].type("4");
    await inputs[1].type("6");
    await inputs[inputs.length - 2].type("10");
    await inputs[inputs.length - 1].type("15");

    await new Promise((r) => setTimeout(r, 200));
    const total = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll("p")).find(
        (p) => /^\d[\d,]*$/.test((p.textContent ?? "").trim()) &&
          p.className.includes("text-[34px]"),
      );
      return el?.textContent?.trim() ?? "";
    });
    assert("live total sums the matrix", total === "35", `showed "${total}", expected 35`);

    // --- facilitators -------------------------------------------------------
    await page.type("#facilitators", "Ngwa Brenda");
    await page.keyboard.press("Enter");

    // --- submit -------------------------------------------------------------
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0", timeout: 30_000 }),
      page.evaluate(() => {
        const button = Array.from(document.querySelectorAll("button")).find((b) =>
          /Log session/i.test(b.textContent ?? ""),
        );
        (button as HTMLButtonElement)?.click();
      }),
    ]);
    assert("redirected to the sessions list", page.url().endsWith("/sessions"), page.url());

    // --- the database ------------------------------------------------------
    const after = await prisma.session.count();
    assert("one session created", after === before + 1, `${before} → ${after}`);

    const created = await prisma.session.findFirst({
      orderBy: { createdAt: "desc" },
      include: {
        community: true,
        counts: true,
        facilitators: true,
      },
    });
    createdId = created?.id ?? null;
    assert("saved against the right community", created?.community.name === "Molyko", created?.community.name);
    assert("total persisted", created?.totalParticipants === 35, String(created?.totalParticipants));
    assert("count rows stored", created?.counts.length === 4, `${created?.counts.length} rows`);
    assert("facilitator stored", created?.facilitators[0]?.name === "Ngwa Brenda", created?.facilitators[0]?.name);
  } finally {
    await browser.close();
    if (createdId) {
      await prisma.session.delete({ where: { id: createdId } });
      console.log("  ·     test session removed");
    }
  }

  console.log(failures === 0 ? "\nEntry flow works end to end.\n" : `\n${failures} failed.\n`);
  if (failures > 0) process.exitCode = 1;
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
