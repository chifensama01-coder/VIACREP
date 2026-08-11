/**
 * Local development database.
 *
 * VIAC Reports runs on real PostgreSQL, but nobody should have to install a
 * database server to walk the demo. `embedded-postgres` ships the official
 * PostgreSQL binaries through npm and runs them out of `.pgdata/`, so
 * `npm run db` gives you a genuine Postgres on port 5433 with no installer,
 * no Docker and no cloud account.
 *
 * Keep this running in its own terminal while you use `npm run dev`.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const DATA_DIR = path.resolve(process.cwd(), ".pgdata");
const PORT = Number(process.env.PGDEV_PORT ?? 5433);
const USER = "postgres";
const PASSWORD = "postgres";
const DATABASE = "viac";

const pg = new EmbeddedPostgres({
  databaseDir: DATA_DIR,
  user: USER,
  password: PASSWORD,
  port: PORT,
  persistent: true,
  onLog: () => {},
  onError: () => {},
});

async function main() {
  const firstRun = !existsSync(path.join(DATA_DIR, "PG_VERSION"));

  if (firstRun) {
    console.log("· Initialising a fresh PostgreSQL cluster in .pgdata …");
    await pg.initialise();
  }

  await pg.start();
  console.log(`· PostgreSQL is up on port ${PORT}`);

  if (firstRun) {
    await pg.createDatabase(DATABASE);
    console.log(`· Created database "${DATABASE}"`);
  } else {
    // The cluster may exist without the database (e.g. a half-finished setup).
    const client = pg.getPgClient();
    await client.connect();
    const { rows } = await client.query(
      "select 1 from pg_database where datname = $1",
      [DATABASE],
    );
    if (rows.length === 0) {
      await client.query(`create database "${DATABASE}"`);
      console.log(`· Created database "${DATABASE}"`);
    }
    await client.end();
  }

  console.log(
    `\n  DATABASE_URL="postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}"\n`,
  );
  console.log("· Ready. Leave this running; press Ctrl+C to stop.");

  const shutdown = async () => {
    console.log("\n· Stopping PostgreSQL …");
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Hold the event loop open for as long as the server should live.
  setInterval(() => {}, 1 << 30);
}

main().catch(async (error) => {
  console.error("Failed to start the development database:\n", error);
  await pg.stop().catch(() => {});
  process.exit(1);
});
