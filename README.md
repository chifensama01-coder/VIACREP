# VIAC Reports

An internal reporting platform for **Vision in Action Cameroon** — replacing the
`Vision_In_Action_Reporting_Template.xlsx` workbook with a fast entry form, a
live dashboard, and standardised reports on the VIAC letterhead.

The workbook quietly did two jobs, and this keeps them apart:

- **Numbers are computed** from the session records. No person and no model
  writes a statistic.
- **Words are typed by staff** — objectives, methodology, lessons learnt,
  challenges, recommendations — and carry forward from the previous period.

A report is those two halves merged onto the letterhead. There are no AI
features anywhere in the product.

---

## Running it

Two terminals, no installers, no cloud accounts.

```bash
npm install

# terminal 1 — a real PostgreSQL, shipped through npm, running out of .pgdata
npm run db

# terminal 2 — schema, seed data, then the app
npm run setup
npm run dev
```

Open http://localhost:3000 and sign in with any of the seeded accounts
(password `viac2026` for all four):

| Account | Role | Sees |
|---|---|---|
| `coordinator@viacame.org` | Coordinator | Everything, plus settings |
| `approver@viacame.org` | Approver | Everything |
| `officer.fako@viacame.org` | Officer | Own entries + Fako division |
| `officer.mezam@viacame.org` | Officer | Own entries + Mezam division |

`npm run db:reset` wipes and re-seeds.

---

## Deploying

The app is a normal Next.js 16 server app, so any Node host works. Two configs
are checked in: `vercel.json` and `netlify.toml`. Both do the same two things —
run `prisma generate` before the build, and skip Puppeteer's 170 MB Chrome
download, which no serverless function can use anyway (see *PDF on serverless
hosts* below).

Two things have no cloud equivalent and must be supplied:

**1. A reachable Postgres.** `npm run db` starts a PostgreSQL *on your machine*
at `localhost:5433`. A deployed function cannot reach it, and every page that
touches the database — including `/sign-in`, which lists the demo accounts —
will return a server error until `DATABASE_URL` points somewhere real. Neon,
Supabase and Netlify DB all have a free tier that fits this app.

**2. Environment variables**, set in the host's UI (`.env` is git-ignored):

| Variable | Value |
|---|---|
| `DATABASE_URL` | The hosted Postgres connection string |
| `AUTH_SECRET` | A long random string — `node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"` |

Then create the schema and seed it **once**, from your machine, pointed at the
cloud database:

```bash
DATABASE_URL="postgresql://…the hosted one…" npm run deploy:push
DATABASE_URL="postgresql://…the hosted one…" npm run deploy:seed
```

### Vercel, start to finish

No GitHub repo is needed — the CLI uploads this folder directly.

```bash
npx vercel login
npx vercel link          # creates the project
```

Add a database from the project's **Storage** tab — Neon's free tier is enough,
and the integration writes `DATABASE_URL` into the project for you. Then the
signing key, and the first real deploy:

```bash
npx vercel env add AUTH_SECRET production   # paste a long random string
npx vercel --prod
```

Finally point the schema tools at the cloud database once. Pull the URL Neon
wrote so you are certain it is the same one the deployment uses:

```bash
npx vercel env pull .env.production
# then run deploy:push / deploy:seed with that DATABASE_URL, as above
```

Visit the deployment and sign in with a seeded account.

**Why `vercel.json` exists.** Vercel caches `node_modules` between builds, so a
`postinstall`-generated Prisma Client can go stale against a changed schema;
the pinned `buildCommand` regenerates it every time.

### Letterhead files and output tracing

`src/lib/exports/docx.ts` reads the letterhead PNGs at request time from a path
built out of `process.cwd()`. Next's output file tracer cannot follow a computed
path, and on a serverless host `public/` is served by the CDN rather than mounted
on the function — so the Word export would throw `ENOENT` in production while
working perfectly on a laptop. `outputFileTracingIncludes` in `next.config.ts`
pins those two PNGs into every server bundle. Verify after a build:

```bash
node -e "console.log(require('./.next/server/app/api/export/docx/route.js.nft.json').files.filter(f=>/letterhead/.test(f)))"
```

Hosts that run a real `next start` server (Railway, Render, a VPS) have the whole
project directory on disk and never needed this.

### PDF on serverless hosts

Word and Excel are pure JavaScript and run anywhere. PDF used to need a real
Chrome, which no serverless function has — Netlify caps a function bundle at
50 MB and Chromium alone is roughly three times that.

So the **PDF button prints the document from the reader's own browser**.
`/print/report?…&print=1` opens the finished report and the print dialog
together; "Save as PDF" produces the same file the server renderer would. The
route needs no Chrome on the host, so it behaves identically on a laptop, on
Vercel and on Netlify.

`/api/export/pdf` still renders server-side with Puppeteer — useful for scripts
and for `npm run check:exports` — and answers `501` pointing at the Word export
when no browser is available.

### Scripts

| Command | What it does |
|---|---|
| `npm run db` | Starts the local PostgreSQL (leave running) |
| `npm run setup` | `prisma generate` + `db push` + seed |
| `npm run dev` | Next.js dev server |
| `npm run db:reset` | Drops everything and re-seeds |
| `npx tsx scripts/smoke.ts` | Walks every route as two different roles |
| `npx tsx scripts/verify-exports.ts` | Downloads all three exports and inspects them |
| `npx tsx scripts/pdf-pages.ts` | Renders each PDF page to a PNG in `.verify/` |
| `npx tsx scripts/screenshots.ts` | Screenshots every screen, desktop and phone |

---

## How it fits together

```
src/lib/scope.ts        A view = period + filters. Monthly, quarterly, per
                        project, per community and single-activity reports are
                        all the same object with different fields set.

src/lib/aggregate.ts    THE query engine. One function behind every dashboard
                        tile, every computed report section and the Excel
                        export — so the three can never disagree. Replaces the
                        workbook's SUMIFs and four pivot sheets.

src/lib/report.ts       Builds the twelve-section document from an aggregate
                        plus the typed narrative. Format-agnostic.

src/lib/narrative.ts    Loads typed sections for a scope: saved text, else the
                        previous period's text, else the organisation defaults.

src/lib/exports/        pdf.ts · docx.ts · excel.ts — three renderers over the
                        one document model.
```

Roles scope **visibility only**. Anyone can author any report; an officer just
sees fewer sessions in it.

---

## The three outputs

**PDF** — `/print/report` is the document, and the same page the report builder
shows as a live preview, so what staff approve is what prints. The whole report
is one table: the letterhead header band is its `<thead>` and the footer band
its `<tfoot>`, which every paged-media engine reprints on each page. That is the
only mechanism that works in *both* the browser's own "Save as PDF" and
Puppeteer — Chromium's margin-box templates are Puppeteer-only, and
`position: fixed` bands are laid out against the document rather than the page
and paint straight through the body text. Its one cost: on the final page the
footer sits under the content instead of pinned to the bottom.

**Word** — a real `.docx` with the letterhead PNGs in a Word section header and
footer, so it repeats on every page and survives editing.

**Excel** — the workbook, regenerated. Columns **A–U of the `Data` sheet match
`Data_Entry` exactly**, including the odd `MALE` / `MALE:` / `MALE.` / `MALE-` /
`MALE_` headers the original had to invent because Excel rejects duplicate
column names. Everything this platform added — activity type, facilitators,
notes, region — sits after the TOTAL column so VIAC's own formulas still line
up. Eight summary sheets replace the pivots.

`scripts/verify-exports.ts` asserts all of that on every run, including that
each row's TOTAL equals the sum of its count cells and that the Summary sheet
agrees with the Data sheet.

---

## Fidelity to the workbook

| Workbook | Here |
|---|---|
| `Sheet1` — 103 communities | Seeded as Region → Division → Subdivision → Community, with manual add |
| `Data_Entry` row | One `Session`; only Date and Community required |
| Week, Month columns | Derived from the date, same `WEEKNUM` / `mmm-yyyy` rules |
| Division – Subdivision | Auto-filled from the chosen community |
| Age Group dropdown | `Adolescents, Youth, Adults`, verbatim |
| Project dropdown | `SPS Project, VIAC Program, HVF Project, MAMA Project, WHW Project`, verbatim |
| Thematic Area | No validation list in the workbook → free entry, seeded with the topics the narrative names |
| 12 count columns | `SessionCount` rows, so a population can be added without a migration |
| `Narrative_Report` | The twelve sections, in order, with the original default text |

Two fields were added at VIAC's request and are not in the sheet: **type of
activity** and **facilitators**.

### Decisions taken

The brief left four open, with recommendations. All four went the recommended
way: thematic area is free entry; approval is name/designation fields rather
than a workflow; only coordinators can add a community; the single-activity
report is included.

One deliberate departure: sections 3–6 print as tables rather than the
workbook's `• Name: N participants` bullets. Same data, same order, but legible
in a document a donor will read.

---

## Design

Two brand colours drive everything: blue `#1CA3EC` and gold `#DDA328`, each
expanded into a 50–900 OKLCH ramp with the brand hex sitting exactly on step
500. The chart series were checked with a palette validator — lightness band,
chroma floor, protanopia/deuteranopia/tritanopia separation, contrast against
white. Gold sits below 3:1 on white by nature, so every chart that uses it also
carries value labels and a legend.

---

## Not built (Phase 2)

Offline capture, SMS/WhatsApp reminders, importing the workbook's historical
rows, attendance-sheet photos, Department/Campaign filters, multi-organisation,
e-signatures, audit logs, and any AI feature.
