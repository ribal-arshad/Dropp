import { Args, Command, Flags } from "@oclif/core";
import { access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import type { DroppConfig } from "../../../types/index.js";

const ORM_OPTIONS = [
  "prisma",
  "typeorm",
  "drizzle",
  "sequelize",
  "mikroorm",
  "mongoose",
  "kysely",
] as const;

type SupportedOrm = (typeof ORM_OPTIONS)[number];

const TEMPLATE_MAP: Record<SupportedOrm, string> = {
  prisma: `import { PrismaClient } from "@prisma/client";
import { PrismaMediaRepository } from "../../../db/prisma/index.js";

const prisma = new PrismaClient();

export const mediaRepository = async () => {
  return new PrismaMediaRepository(prisma);
};
`,
  typeorm: `import { DataSource } from "typeorm";
import { TypeOrmMediaRepository } from "../../../db/typeorm/index.js";

// Replace this with your actual Media entity class
import { MediaEntity } from "./entities/MediaEntity.js";

const dataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? "postgres",
  password: process.env.DB_PASSWORD ?? "postgres",
  database: process.env.DB_NAME ?? "app",
  entities: [MediaEntity],
  synchronize: false,
});

export const mediaRepository = async () => {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  const repo = dataSource.getRepository(MediaEntity);
  return new TypeOrmMediaRepository(repo);
};
`,
  drizzle: `import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { DrizzleMediaRepository } from "../../../db/drizzle/index.js";

// Replace this with your actual Drizzle media table object
import { mediaTable } from "./schema.js";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export const mediaRepository = async () => {
  return new DrizzleMediaRepository(db, mediaTable);
};
`,
  sequelize: `import { Sequelize } from "sequelize";
import { SequelizeMediaRepository } from "../../../db/sequelize/index.js";

// Replace this with your Sequelize model
import { MediaModel } from "./models/MediaModel.js";

const sequelize = new Sequelize(
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/app",
  { logging: false },
);

export const mediaRepository = async () => {
  await sequelize.authenticate();
  return new SequelizeMediaRepository(MediaModel);
};
`,
  mikroorm: `import { MikroORM } from "@mikro-orm/core";
import { MikroOrmMediaRepository } from "../../../db/mikroorm/index.js";

// Replace this with your MikroORM entity
import { MediaEntity } from "./entities/MediaEntity.js";

let ormPromise;

function getOrm() {
  if (!ormPromise) {
    ormPromise = MikroORM.init({
      entities: [MediaEntity],
      dbName: process.env.DB_NAME ?? "app",
      type: "postgresql",
      user: process.env.DB_USER ?? "postgres",
      password: process.env.DB_PASSWORD ?? "postgres",
      host: process.env.DB_HOST ?? "127.0.0.1",
      port: Number(process.env.DB_PORT ?? 5432),
    });
  }

  return ormPromise;
}

export const mediaRepository = async () => {
  const orm = await getOrm();
  const em = orm.em.fork();
  const repo = em.getRepository(MediaEntity);
  return new MikroOrmMediaRepository(repo, em);
};
`,
  mongoose: `import mongoose from "mongoose";
import { MongooseMediaRepository } from "../../../db/mongoose/index.js";

// Replace this with your Mongoose model
import { MediaModel } from "./models/MediaModel.js";

let connected = false;

async function ensureConnection() {
  if (connected) return;

  await mongoose.connect(
    process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/app",
  );

  connected = true;
}

export const mediaRepository = async () => {
  await ensureConnection();
  return new MongooseMediaRepository(MediaModel);
};
`,
  kysely: `import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import { KyselyMediaRepository } from "../../../db/kysely/index.js";

const db = new Kysely({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString: process.env.DATABASE_URL,
    }),
  }),
});

export const mediaRepository = async () => {
  return new KyselyMediaRepository(db, "media");
};
`,
};

export default class GenerateRepository extends Command {
  static override description =
    "Generate a dropp.repository.ts template and wire dropp.config.json";

  static override args = {
    orm: Args.string({
      description: "Target ORM template",
      required: true,
      options: ORM_OPTIONS as unknown as string[],
    }),
  };

  static override flags = {
    force: Flags.boolean({
      char: "f",
      description: "Overwrite existing dropp.repository.ts",
      default: false,
    }),
    configOnly: Flags.boolean({
      description: "Only patch dropp.config.json without writing template file",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(GenerateRepository);
    const orm = args.orm as SupportedOrm;

    const repositoryTsPath = join(process.cwd(), "dropp.repository.ts");

    if (!flags.configOnly) {
      await this.ensureWritable(repositoryTsPath, flags.force);
      await writeFile(repositoryTsPath, TEMPLATE_MAP[orm], "utf8");
      this.log(`Generated template: ${repositoryTsPath}`);
    }

    const configPath = join(process.cwd(), "dropp.config.json");
    const config = await this.readOrCreateConfig(configPath);

    config.orm = {
      ...config.orm,
      driver: orm,
      repository: {
        module: "./dropp.repository.js",
        exportName: "mediaRepository",
      },
    };

    await writeFile(configPath, JSON.stringify(config, null, 2), "utf8");
    this.log(`Updated config: ${configPath}`);
    this.log(
      "Note: compile dropp.repository.ts to dropp.repository.js before runtime.",
    );
  }

  private async ensureWritable(path: string, force: boolean): Promise<void> {
    try {
      await access(path, constants.F_OK);
    } catch {
      // Missing file is fine.
      return;
    }

    if (!force) {
      throw new Error(`${path} already exists. Use --force to overwrite.`);
    }
  }

  private async readOrCreateConfig(path: string): Promise<DroppConfig> {
    try {
      await access(path, constants.F_OK);
      const raw = await readFile(path, "utf8");
      return JSON.parse(raw) as DroppConfig;
    } catch {
      const base: DroppConfig = {
        orm: {
          driver: "json",
        },
        storage: {
          driver: "local",
          local: {
            baseDir: "media",
            baseUrl: "/media",
          },
        },
        queue: {
          enabled: false,
        },
      };

      return base;
    }
  }
}
