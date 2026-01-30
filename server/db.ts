import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as baseSchema from "@shared/schema";
import * as enterpriseSchema from "../shared/enterprise-schema";

// Merge base and enterprise schemas
const schema = { ...baseSchema, ...enterpriseSchema };

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Re-export all schema tables for convenience
export { baseSchema, enterpriseSchema };
