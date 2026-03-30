import { Args, Command, Flags } from "@oclif/core";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";
import type { DroppConfig } from "../../types/index.js";

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
import { PrismaMediaRepository } from "../../db/prisma/index.js";

const prisma = new PrismaClient();

export const mediaRepository = async () => {
  return new PrismaMediaRepository(prisma);
};
`,
  typeorm: `import { DataSource } from "typeorm";
import { TypeOrmMediaRepository } from "../../db/typeorm/index.js";

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
import { DrizzleMediaRepository } from "../../db/drizzle/index.js";

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
import { SequelizeMediaRepository } from "../../db/sequelize/index.js";

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
import { MikroOrmMediaRepository } from "../../db/mikroorm/index.js";

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
import { MongooseMediaRepository } from "../../db/mongoose/index.js";

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
import { KyselyMediaRepository } from "../../db/kysely/index.js";

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

export default class Generate extends Command {
  static override description = "Generate assets like repository templates";

  static override args = {
    target: Args.string({
      description: "Generator target",
      required: true,
      options: ["repository", "model", "migration", "all"],
    }),
    value: Args.string({
      description:
        "For repository: ORM name. For model/all: model name (example: media)",
      required: true,
    }),
  };

  static override flags = {
    orm: Flags.string({
      description: "Target ORM for model/migration generation",
      options: ORM_OPTIONS as unknown as string[],
    }),
    force: Flags.boolean({
      char: "f",
      description: "Overwrite existing generated file",
      default: false,
    }),
    configOnly: Flags.boolean({
      description: "Only patch dropp.config.json without writing template file",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Generate);

    if (args.target === "repository") {
      const orm = args.value as SupportedOrm;
      if (!ORM_OPTIONS.includes(orm)) {
        throw new Error(`Unsupported ORM '${args.value}'.`);
      }

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
      return;
    }

    if (args.target === "model") {
      const orm = (flags.orm ?? "prisma") as SupportedOrm;
      if (!ORM_OPTIONS.includes(orm)) {
        throw new Error(`Unsupported ORM '${orm}'.`);
      }

      const modelName = args.value.toLowerCase();
      const className = this.toPascalCase(modelName);
      const targetPath = this.resolveModelOutputPath(orm, modelName, className);
      await this.ensureWritable(targetPath, flags.force);

      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(
        targetPath,
        this.renderModelTemplate(orm, modelName, className),
        "utf8",
      );
      this.log(`Generated model template: ${targetPath}`);
      return;
    }

    if (args.target === "migration") {
      const orm = (flags.orm ?? "prisma") as SupportedOrm;
      if (!ORM_OPTIONS.includes(orm)) {
        throw new Error(`Unsupported ORM '${orm}'.`);
      }

      const migrationName = this.toSnakeCase(args.value);
      const timestamp = this.getTimestamp();
      const targetPath = this.resolveMigrationOutputPath(
        orm,
        timestamp,
        migrationName,
      );
      await this.ensureWritable(targetPath, flags.force);

      await mkdir(dirname(targetPath), { recursive: true });
      await writeFile(
        targetPath,
        this.renderMigrationTemplate(orm, timestamp, migrationName),
        "utf8",
      );
      this.log(`Generated migration template: ${targetPath}`);
      return;
    }

    if (args.target === "all") {
      const orm = (flags.orm ?? "prisma") as SupportedOrm;
      if (!ORM_OPTIONS.includes(orm)) {
        throw new Error(`Unsupported ORM '${orm}'.`);
      }

      const projectName = this.toSnakeCase(args.value);
      const className = this.toPascalCase(projectName);

      this.log(`Scaffolding ${orm} project: ${projectName}`);

      // 1. Generate repository
      this.log("\n[1/3] Generating repository...");
      const repositoryTsPath = join(process.cwd(), "dropp.repository.ts");
      await mkdir(dirname(repositoryTsPath), { recursive: true });
      await writeFile(repositoryTsPath, TEMPLATE_MAP[orm], "utf8");
      this.log(`  ✓ Repository: ${repositoryTsPath}`);

      // 2. Generate model
      this.log("[2/3] Generating model...");
      const modelTargetPath = this.resolveModelOutputPath(
        orm,
        projectName,
        className,
      );
      await mkdir(dirname(modelTargetPath), { recursive: true });
      await writeFile(
        modelTargetPath,
        this.renderModelTemplate(orm, projectName, className),
        "utf8",
      );
      this.log(`  ✓ Model: ${modelTargetPath}`);

      // 3. Generate migration
      this.log("[3/3] Generating migration...");
      const migrationName = `create_${projectName}_table`;
      const timestamp = this.getTimestamp();
      const migrationTargetPath = this.resolveMigrationOutputPath(
        orm,
        timestamp,
        migrationName,
      );
      await mkdir(dirname(migrationTargetPath), { recursive: true });
      await writeFile(
        migrationTargetPath,
        this.renderMigrationTemplate(orm, timestamp, migrationName),
        "utf8",
      );
      this.log(`  ✓ Migration: ${migrationTargetPath}`);

      // 4. Update config
      this.log("[4/4] Updating config...");
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
      this.log(`  ✓ Config: ${configPath}`);

      this.log(
        "\n✅ Complete! Next: compile dropp.repository.ts to .js and run migrations.",
      );
      return;
    }

    throw new Error(`Unsupported generate target: ${args.target}`);
  }

  private resolveModelOutputPath(
    orm: SupportedOrm,
    modelName: string,
    className: string,
  ): string {
    if (orm === "prisma")
      return join(process.cwd(), "prisma", `schema.${modelName}.prisma`);
    if (orm === "drizzle")
      return join(process.cwd(), "src", "db", `schema.${modelName}.ts`);
    if (orm === "sequelize")
      return join(process.cwd(), "src", "models", `${className}.model.ts`);
    if (orm === "mongoose")
      return join(process.cwd(), "src", "models", `${className}.model.ts`);
    if (orm === "kysely")
      return join(process.cwd(), "src", "db", `${modelName}.types.ts`);
    return join(process.cwd(), "src", "entities", `${className}.entity.ts`);
  }

  private renderModelTemplate(
    orm: SupportedOrm,
    modelName: string,
    className: string,
  ): string {
    if (orm === "prisma") {
      return `model ${className} {
  id         String   @id @default(uuid())
  model      String
  modelId    String
  collection String
  fileName   String
  mimeType   String
  size       Int
  disk       String
  path       String
  url        String
  metadata   Json
  createdAt  DateTime @default(now())

  @@map("${modelName}")
}\n`;
    }

    if (orm === "drizzle") {
      return `import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const ${modelName}Table = pgTable("${modelName}", {
  id: uuid("id").defaultRandom().primaryKey(),
  model: text("model").notNull(),
  modelId: text("model_id").notNull(),
  collection: text("collection").notNull().default("default"),
  fileName: text("file_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull().default(0),
  disk: text("disk").notNull().default("default"),
  path: text("path").notNull(),
  url: text("url").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});\n`;
    }

    return `// Replace with your ${orm} model/entity definition for '${modelName}'.\n`;
  }

  private resolveMigrationOutputPath(
    orm: SupportedOrm,
    timestamp: string,
    migrationName: string,
  ): string {
    if (orm === "prisma") {
      return join(
        process.cwd(),
        "prisma",
        "migrations",
        `${timestamp}_${migrationName}`,
        "migration.sql",
      );
    }

    if (orm === "drizzle") {
      return join(
        process.cwd(),
        "drizzle",
        `${timestamp}_${migrationName}.sql`,
      );
    }

    return join(
      process.cwd(),
      "src",
      "migrations",
      `${timestamp}_${migrationName}.ts`,
    );
  }

  private renderMigrationTemplate(
    orm: SupportedOrm,
    timestamp: string,
    migrationName: string,
  ): string {
    if (orm === "prisma") {
      return `-- Prisma migration: ${timestamp}_${migrationName}\n-- Write SQL for your provider here.\n`;
    }

    if (orm === "drizzle") {
      return `-- Drizzle migration: ${timestamp}_${migrationName}\n-- Example:\n-- CREATE TABLE media (...);\n`;
    }

    return `// Migration: ${timestamp}_${migrationName}\nexport async function up(): Promise<void> {\n  // TODO\n}\n\nexport async function down(): Promise<void> {\n  // TODO\n}\n`;
  }

  private getTimestamp(): string {
    const now = new Date();
    const pad = (value: number) => value.toString().padStart(2, "0");

    return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
  }

  private toSnakeCase(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  private toPascalCase(value: string): string {
    return value
      .split(/[^a-zA-Z0-9]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
  }

  private async ensureWritable(path: string, force: boolean): Promise<void> {
    try {
      await access(path, constants.F_OK);
    } catch {
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
      return {
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
    }
  }
}
