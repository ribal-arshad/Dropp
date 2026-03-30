import { Command, Flags } from "@oclif/core";
import { loadConfig } from "../../config/index.js";
import type { DroppConfig } from "../../types/index.js";
import { exec as execCallback } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execCallback);

type MigrateMode = "dev" | "deploy" | "status";

type SupportedRuntimeOrm =
  | "prisma"
  | "typeorm"
  | "drizzle"
  | "sequelize"
  | "mikroorm";

const ORM_OPTIONS = [
  "prisma",
  "typeorm",
  "drizzle",
  "sequelize",
  "mikroorm",
  "mongoose",
  "kysely",
  "json",
  "custom",
] as const;

export default class Migrate extends Command {
  static override description =
    "Run database migrations for the configured ORM";

  static override examples = [
    "<%= config.bin %> <%= command.id %>",
    "<%= config.bin %> <%= command.id %> --mode status",
    "<%= config.bin %> <%= command.id %> --orm prisma --name create_media_table",
    "<%= config.bin %> <%= command.id %> --dry-run",
  ];

  static override flags = {
    orm: Flags.string({
      description: "Override ORM driver from config",
      options: ORM_OPTIONS as unknown as string[],
    }),
    mode: Flags.string({
      description: "Migration mode",
      options: ["dev", "deploy", "status"],
      default: "dev",
    }),
    name: Flags.string({
      description: "Migration name (used by Prisma dev mode)",
      default: "dropp_migration",
    }),
    dryRun: Flags.boolean({
      description: "Print migration command without executing",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Migrate);
    const { config } = await loadConfig(process.cwd());

    const orm = (flags.orm ??
      config.orm.driver) as DroppConfig["orm"]["driver"];
    const mode = flags.mode as MigrateMode;

    const command = this.resolveCommand(orm, mode, flags.name);

    if (!command) {
      throw new Error(
        `No migration runner is configured for orm='${orm}'. Supported runtime runners: prisma, typeorm, drizzle, sequelize, mikroorm.`,
      );
    }

    this.log(`ORM: ${orm}`);
    this.log(`Mode: ${mode}`);
    this.log(`Command: ${command}`);

    if (flags.dryRun) {
      this.log("Dry run enabled. Command not executed.");
      return;
    }

    try {
      const { stdout, stderr } = await exec(command, {
        cwd: process.cwd(),
        env: process.env,
      });

      if (stdout.trim()) this.log(stdout.trim());
      if (stderr.trim()) this.warn(stderr.trim());
      this.log("Migration command completed.");
    } catch (error) {
      const err = error as {
        message: string;
        stdout?: string;
        stderr?: string;
      };

      if (err.stdout?.trim()) this.log(err.stdout.trim());
      if (err.stderr?.trim()) this.error(err.stderr.trim(), { exit: 1 });

      this.error(err.message, { exit: 1 });
    }
  }

  private resolveCommand(
    orm: DroppConfig["orm"]["driver"],
    mode: MigrateMode,
    migrationName: string,
  ): string | null {
    if (!this.isSupportedRuntimeOrm(orm)) return null;

    if (orm === "prisma") {
      if (mode === "status") return "pnpm prisma migrate status";
      if (mode === "deploy") return "pnpm prisma migrate deploy";
      return `pnpm prisma migrate dev --name ${this.sanitizeShellArg(migrationName)}`;
    }

    if (orm === "typeorm") {
      if (mode === "status") return "pnpm typeorm migration:show";
      return "pnpm typeorm migration:run";
    }

    if (orm === "drizzle") {
      if (mode === "status") return "pnpm drizzle-kit check";
      return "pnpm drizzle-kit migrate";
    }

    if (orm === "sequelize") {
      if (mode === "status") return "pnpm sequelize-cli db:migrate:status";
      return "pnpm sequelize-cli db:migrate";
    }

    if (orm === "mikroorm") {
      if (mode === "status") return "pnpm mikro-orm migration:list";
      return "pnpm mikro-orm migration:up";
    }

    return null;
  }

  private isSupportedRuntimeOrm(value: string): value is SupportedRuntimeOrm {
    return ["prisma", "typeorm", "drizzle", "sequelize", "mikroorm"].includes(
      value,
    );
  }

  private sanitizeShellArg(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]/g, "_");
  }
}
