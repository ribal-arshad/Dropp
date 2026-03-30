// @ts-nocheck
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { DrizzleMediaRepository } from "droppjs";

// Replace this with your actual Drizzle media table object
import { mediaTable } from "./schema.js";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export const mediaRepository = async () => {
  return new DrizzleMediaRepository(db, mediaTable);
};
