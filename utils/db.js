import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// Use DATABASE_URL (server-side only, not exposed to browser)
// Falls back to NEXT_PUBLIC_DRIZZLE_DB_URL for backwards compatibility
const connectionString = process.env.DATABASE_URL || process.env.NEXT_PUBLIC_DRIZZLE_DB_URL;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Required for Supabase/Neon pooler connections
});

export const db = drizzle(pool, { schema });
