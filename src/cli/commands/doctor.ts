import { Command, Flags } from "@oclif/core";
import { loadConfig } from "../../config/index.js";
import { resolveRepository } from "../utils/repository.js";
import chalk from "chalk";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";

type CheckStatus = "pass" | "warn" | "fail";

type DoctorCheck = {
  name: string;
  status: CheckStatus;
  message: string;
};

export default class Doctor extends Command {
  static override description =
    "Validate your Dropp environment and dependencies";

  static override flags = {
    json: Flags.boolean({
      description: "Print machine-readable JSON report",
      default: false,
    }),
    verbose: Flags.boolean({
      description: "Include additional diagnostics",
      default: false,
    }),
    strict: Flags.boolean({
      description: "Exit with non-zero code on warnings as well",
      default: false,
    }),
  };

  private checks: DoctorCheck[] = [];

  private addCheck(name: string, status: CheckStatus, message: string): void {
    this.checks.push({ name, status, message });
  }

  private hasFailures(): boolean {
    return this.checks.some((check) => check.status === "fail");
  }

  private hasWarnings(): boolean {
    return this.checks.some((check) => check.status === "warn");
  }

  private renderCheck(check: DoctorCheck): string {
    const status =
      check.status === "pass"
        ? chalk.green("PASS")
        : check.status === "warn"
          ? chalk.yellow("WARN")
          : chalk.red("FAIL");

    return `${status} ${check.name}: ${check.message}`;
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Doctor);
    const cwd = process.cwd();
    const configPath = join(process.cwd(), "dropp.config.json");

    this.addCheck("Node runtime", "pass", `Detected Node ${process.version}`);

    try {
      await access(configPath, constants.F_OK);
      this.addCheck("Config file", "pass", "dropp.config.json found");
    } catch {
      this.addCheck(
        "Config file",
        "fail",
        "dropp.config.json missing (run `dropp init`)",
      );
    }

    let config: Awaited<ReturnType<typeof loadConfig>>["config"] | undefined =
      undefined;

    if (!this.hasFailures()) {
      try {
        const loaded = await loadConfig(cwd);
        config = loaded.config;
        this.addCheck(
          "Config schema",
          "pass",
          `Valid config (orm=${config.orm.driver}, storage=${config.storage.driver})`,
        );
      } catch (error) {
        this.addCheck("Config schema", "fail", (error as Error).message);
      }
    }

    if (config) {
      const storageDriver = config.storage.driver;
      if (storageDriver === "local") {
        const baseDir = config.storage.local?.baseDir ?? "media";
        this.addCheck(
          "Storage config",
          "pass",
          `local driver configured (baseDir=${baseDir})`,
        );
      } else if (storageDriver === "s3") {
        if (config.storage.s3) {
          this.addCheck(
            "Storage config",
            "pass",
            `s3 driver configured (bucket=${config.storage.s3.bucket}, region=${config.storage.s3.region})`,
          );
        } else {
          this.addCheck(
            "Storage config",
            "fail",
            "storage.driver is s3 but storage.s3 block is missing",
          );
        }
      } else if (storageDriver === "r2") {
        if (config.storage.r2) {
          this.addCheck(
            "Storage config",
            "pass",
            `r2 driver configured (bucket=${config.storage.r2.bucket}, accountId=${config.storage.r2.accountId})`,
          );
        } else {
          this.addCheck(
            "Storage config",
            "fail",
            "storage.driver is r2 but storage.r2 block is missing",
          );
        }
      } else if (storageDriver === "azure") {
        if (config.storage.azure) {
          this.addCheck(
            "Storage config",
            "pass",
            `azure driver configured (container=${config.storage.azure.container})`,
          );
        } else {
          this.addCheck(
            "Storage config",
            "fail",
            "storage.driver is azure but storage.azure block is missing",
          );
        }
      } else if (storageDriver === "gcs") {
        if (config.storage.gcs) {
          this.addCheck(
            "Storage config",
            "pass",
            `gcs driver configured (bucket=${config.storage.gcs.bucket})`,
          );
        } else {
          this.addCheck(
            "Storage config",
            "fail",
            "storage.driver is gcs but storage.gcs block is missing",
          );
        }
      }

      if (config.queue.enabled) {
        if (config.queue.driver && config.queue.driver !== "bullmq") {
          this.addCheck(
            "Queue config",
            "fail",
            `Unsupported queue driver '${config.queue.driver}'`,
          );
        } else if (!process.env.REDIS_URL) {
          this.addCheck(
            "Queue config",
            "warn",
            "Queue enabled but REDIS_URL is not set",
          );
        } else {
          this.addCheck(
            "Queue config",
            "pass",
            "Queue enabled with REDIS_URL set",
          );
        }
      } else {
        this.addCheck("Queue config", "pass", "Queue disabled");
      }

      if (config.plugins && Object.keys(config.plugins).length > 0) {
        const enabledPlugins = Object.entries(config.plugins).filter(
          ([, plugin]) => plugin.enabled !== false,
        ).length;
        this.addCheck(
          "Plugin config",
          "pass",
          `${enabledPlugins}/${Object.keys(config.plugins).length} plugin(s) enabled`,
        );
      } else {
        this.addCheck("Plugin config", "warn", "No plugins configured");
      }

      try {
        await resolveRepository(config, cwd);
        this.addCheck(
          "Repository adapter",
          "pass",
          `Resolved repository for orm=${config.orm.driver}`,
        );
      } catch (error) {
        this.addCheck("Repository adapter", "fail", (error as Error).message);
      }
    }

    const adapterChecks = [
      {
        label: "Express adapter",
        path: join(cwd, "packages", "adapters", "express", "src", "index.ts"),
      },
      {
        label: "NestJS adapter",
        path: join(cwd, "packages", "adapters", "nestjs", "src", "index.ts"),
      },
      {
        label: "Next.js adapter",
        path: join(cwd, "packages", "adapters", "next", "src", "index.ts"),
      },
    ] as const;

    let adaptersFound = 0;
    for (const adapter of adapterChecks) {
      try {
        await access(adapter.path, constants.F_OK);
        adaptersFound++;
      } catch {
        // ignore, this is optional in downstream consumer projects
      }
    }

    if (adaptersFound > 0) {
      this.addCheck(
        "Framework adapters",
        "pass",
        `${adaptersFound}/3 adapter package(s) present in workspace`,
      );
    } else {
      this.addCheck(
        "Framework adapters",
        "warn",
        "No local adapter packages detected (expected in monorepo dev only)",
      );
    }

    if (flags.json) {
      this.log(
        JSON.stringify(
          {
            ok: !this.hasFailures(),
            hasWarnings: this.hasWarnings(),
            checks: this.checks,
          },
          null,
          2,
        ),
      );
    } else {
      this.log(chalk.bold("Dropp Doctor Report"));
      for (const check of this.checks) {
        this.log(this.renderCheck(check));
      }

      const failures = this.checks.filter(
        (check) => check.status === "fail",
      ).length;
      const warnings = this.checks.filter(
        (check) => check.status === "warn",
      ).length;
      const passes = this.checks.filter(
        (check) => check.status === "pass",
      ).length;

      this.log("");
      this.log(
        `Summary: ${chalk.green(`${passes} pass`)}, ${chalk.yellow(`${warnings} warn`)}, ${chalk.red(`${failures} fail`)}`,
      );

      if (flags.verbose) {
        this.log(`cwd: ${cwd}`);
        this.log(`configPath: ${configPath}`);
      }
    }

    if (this.hasFailures() || (flags.strict && this.hasWarnings())) {
      this.exit(1);
    }
  }
}
