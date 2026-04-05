import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

function ensureInitialized() {
  if (!pool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    pool = new Pool({ connectionString: databaseUrl });
    db = drizzle(pool, { schema });
  }
  return { pool, db };
}

// Lazy getters - only initialize when actually used
Object.defineProperty(module.exports, 'pool', {
  get() {
    const { pool: p } = ensureInitialized();
    return p;
  },
});

Object.defineProperty(module.exports, 'db', {
  get() {
    const { db: d } = ensureInitialized();
    return d;
  },
});

export * from "./schema";
