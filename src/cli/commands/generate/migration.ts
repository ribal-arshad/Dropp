import { Args, Command, Flags } from "@oclif/core";
import { access, mkdir, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, join } from "node:path";

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

export default class GenerateMigration extends Command {
  static override description =
    "Generate migration boilerplate for a target ORM";

  static override args = {
    name: Args.string({
      description: "Migration name (example: create-media-table)",
      required: true,
    }),
  };

  static override flags = {
    orm: Flags.string({
      description: "Target ORM",
      required: true,
      options: ORM_OPTIONS as unknown as string[],
    }),
    force: Flags.boolean({
      char: "f",
      description: "Overwrite existing migration file",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(GenerateMigration);
    const orm = flags.orm as SupportedOrm;
    const migrationName = this.toSnakeCase(args.name);
    const timestamp = this.getTimestamp();

    const targetPath = this.resolveOutputPath(orm, timestamp, migrationName);
    await this.ensureWritable(targetPath, flags.force);

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(
      targetPath,
      this.renderTemplate(orm, timestamp, migrationName),
      "utf8",
    );

    this.log(`Generated ${orm} migration template:`);
    this.log(targetPath);
  }

  private resolveOutputPath(
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

    if (orm === "sequelize") {
      return join(
        process.cwd(),
        "src",
        "migrations",
        `${timestamp}-${migrationName}.ts`,
      );
    }

    if (orm === "kysely") {
      return join(
        process.cwd(),
        "src",
        "migrations",
        `${timestamp}_${migrationName}.ts`,
      );
    }

    if (orm === "mongoose") {
      return join(
        process.cwd(),
        "src",
        "migrations",
        `${timestamp}_${migrationName}.ts`,
      );
    }

    return join(
      process.cwd(),
      "src",
      "migrations",
      `${timestamp}_${migrationName}.ts`,
    );
  }

  private renderTemplate(
    orm: SupportedOrm,
    timestamp: string,
    migrationName: string,
  ): string {
    if (orm === "prisma") {
      return `-- Prisma migration: ${timestamp}_${migrationName}
-- Write SQL for your provider here.
`;
    }

    if (orm === "drizzle") {
      return `-- Drizzle migration: ${timestamp}_${migrationName}
-- Example:
-- CREATE TABLE media (...);
`;
    }

    if (orm === "typeorm") {
      return `import { MigrationInterface, QueryRunner } from "typeorm";

export class ${this.toPascalCase(migrationName)}${timestamp} implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(\`/* TODO: create media table */\`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(\`/* TODO: rollback media table */\`);
  }
}
`;
    }

    if (orm === "sequelize") {
      return `import type { QueryInterface } from "sequelize";

export default {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.sequelize.query("/* TODO: create media table */");
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.sequelize.query("/* TODO: rollback media table */");
  },
};
`;
    }

    if (orm === "mikroorm") {
      return `import { Migration } from "@mikro-orm/migrations";

export class ${this.toPascalCase(migrationName)}${timestamp} extends Migration {
  override async up(): Promise<void> {
    this.addSql('/* TODO: create media table */');
  }

  override async down(): Promise<void> {
    this.addSql('/* TODO: rollback media table */');
  }
}
`;
    }

    if (orm === "kysely") {
      return `import type { Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("media")
    .addColumn("id", "uuid", (col) => col.primaryKey())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("media").ifExists().execute();
}
`;
    }

    return `// Mongo/Mongoose migrations are app-specific.
// Implement your migration runner logic here.
export async function up(): Promise<void> {
  // TODO
}

export async function down(): Promise<void> {
  // TODO
}
`;
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
}
