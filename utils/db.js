import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Next.js dev mode re-evaluates modules on every hot reload, and `next build`
// imports this file while collecting page data. Cache on globalThis so reloads
// do not leak connection pools until the database refuses new ones.
const globalForDb = globalThis;

function createDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (server-side only - never prefix it with NEXT_PUBLIC_)."
    );
  }

  // Managed Postgres providers (Supabase / Neon poolers) terminate TLS with a
  // certificate that is not in Node's default trust store. `DATABASE_SSL=disable`
  // opts out entirely for a local Postgres instance.
  const sslMode = process.env.DATABASE_SSL ?? "require";

  const pool = new Pool({
    connectionString,
    ssl: sslMode === "disable" ? false : { rejectUnauthorized: false },
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  // A pool-level error (the provider dropping an idle connection, say) is
  // emitted on the pool itself; with no listener Node treats it as an uncaught
  // exception and kills the server process.
  pool.on("error", (error) => {
    console.error("Unexpected Postgres pool error:", error);
  });

  return drizzle(pool, { schema });
}

function getDb() {
  if (!globalForDb.__careerpilotDb) {
    globalForDb.__careerpilotDb = createDb();
  }

  return globalForDb.__careerpilotDb;
}

/**
 * Connects on first query rather than on import.
 *
 * `next build` (and the Docker image, which builds without an env file) imports
 * this module while collecting page data. Connecting eagerly there would fail
 * the build even though nothing had actually run a query yet.
 */
export const db = new Proxy(
  {},
  {
    get(_target, property) {
      const value = getDb()[property];
      return typeof value === "function" ? value.bind(getDb()) : value;
    },
    has(_target, property) {
      return property in getDb();
    },
  }
);
