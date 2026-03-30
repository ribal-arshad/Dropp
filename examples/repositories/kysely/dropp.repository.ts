// @ts-nocheck
import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { KyselyMediaRepository } from "droppjs";

type Database = {
  media: {
    id: string;
    model: string;
    modelId: string;
    collection: string;
    fileName: string;
    mimeType: string;
    size: number;
    disk: string;
    path: string;
    url: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
  };
};

const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
});

export const mediaRepository = async () => {
  return new KyselyMediaRepository(db, "media");
};
