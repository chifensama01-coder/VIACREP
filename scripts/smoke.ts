/**
 * End-to-end smoke check.
 *
 * Mints a session cookie the same way `lib/auth` does, then walks every page and
 * export endpoint and reports status, size and content type. Run it against a
 * live `npm run dev` with `npx tsx scripts/smoke.ts`.
 */
import { SignJWT } from "jose";
import { PrismaClient } from "@prisma/client";

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3000";
const prisma = new PrismaClient();

async function cookieFor(email: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const token = await new SignJWT({ sub: user.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret);
  return `viac_session=${token}`;
}

async function check(path: string, cookie: string) {
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      headers: { cookie },
      redirect: "manual",
    });
  } catch (error) {
    console.log(`  FAIL  ${path}  ${(error as Error).message}`);
    return false;
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const ms = Date.now() - started;
  const type = (res.headers.get("content-type") ?? "").split(";")[0];
  const location = res.headers.get("location") ?? "";
  const ok = res.status < 400 && !location.includes("/sign-in");
  const flag = ok ? "ok  " : "FAIL";

  console.log(
    `  ${flag}  ${String(res.status).padEnd(3)} ${path.padEnd(52)} ` +
      `${String(buffer.length).padStart(8)}b  ${String(ms).padStart(5)}ms  ${type}${
        location ? `  → ${location}` : ""
      }`,
  );
  if (!ok) {
    // Surface the useful line rather than a wall of Next's error shell.
    const html = buffer.toString("utf8");
    const message =
      /<title>([^<]*)<\/title>/.exec(html)?.[1] ??
      /"message":"((?:[^"\\]|\\.)*)"/.exec(html)?.[1] ??
      html.slice(0, 200);
    console.log(`        ↳ ${message}`);
  }
  return ok;
}

async function main() {
  const [year, month] = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return [d.getFullYear(), d.getMonth() + 1];
  })();
  const monthQuery = `period=month&year=${year}&month=${month}`;

  const session = await prisma.session.findFirst({ orderBy: { date: "desc" } });
  const project = await prisma.project.findFirst();

  const pages = [
    "/",
    "/sign-in",
    "/dashboard",
    `/dashboard?${monthQuery}`,
    `/dashboard?period=quarter&year=${year}&quarter=1`,
    "/dashboard?period=all",
    "/sessions",
    `/sessions?${monthQuery}`,
    "/sessions/new",
    ...(session ? [`/sessions/${session.id}/edit`] : []),
    "/reports",
    `/reports/build?${monthQuery}`,
    ...(project ? [`/reports/build?${monthQuery}&projectId=${project.id}`] : []),
    ...(session ? [`/reports/build?sessionId=${session.id}`] : []),
    "/data",
    "/settings",
    `/api/export/excel?${monthQuery}`,
    `/api/export/docx?${monthQuery}`,
    `/api/export/pdf?${monthQuery}`,
  ];

  for (const [label, email] of [
    ["Coordinator", "coordinator@viacame.org"],
    ["Officer (Fako)", "officer.fako@viacame.org"],
  ] as const) {
    const cookie = await cookieFor(email);
    console.log(`\n${label} — ${email}`);
    let failures = 0;
    for (const path of pages) {
      // Only exercise the slow document exports once, as the coordinator.
      if (label !== "Coordinator" && path.startsWith("/api/export/")) continue;
      const ok = await check(path, cookie);
      if (!ok) failures++;
    }
    if (failures > 0) {
      console.log(`\n  ${failures} failing route(s) for ${label}`);
      process.exitCode = 1;
    }
  }

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
