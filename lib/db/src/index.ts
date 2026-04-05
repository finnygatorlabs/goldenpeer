import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

function ensureInitialized() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
  }
}

// Use a Proxy to lazily initialize on first access
export const pool = new Proxy({} as pg.Pool, {
  get() {
    ensureInitialized();
    return pool;
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    ensureInitialized();
    return (db as any)?.[prop];
  },
});

export * from "./schema";
