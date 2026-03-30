import { Command, Flags } from "@oclif/core";
import { writeFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";

const defaultConfig = {
  orm: {
    driver: "json",
    repository: {
      module: "./dropp.repository.js",
      exportName: "mediaRepository",
    },
  },
  storage: {
    driver: "local",
    local: {
      baseDir: "media",
      baseUrl: "/media",
    },
  },
  queue: { enabled: false },
  cdn: {
    enabled: false,
    provider: "webhook",
    webhook: {
      endpoint: "https://example.com/cdn/purge",
    },
  },
  presets: {
    imageQuality: "balanced",
    responsivePreset: "universal",
    optimizeOnUpload: true,
  },
};

export default class ConfigInit extends Command {
  static override description = "Generate dropp.config.json in current project";

  static override flags = {
    force: Flags.boolean({
      char: "f",
      description: "Overwrite existing dropp.config.json",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ConfigInit);
    const configPath = join(process.cwd(), "dropp.config.json");

    try {
      await access(configPath, constants.F_OK);
      if (!flags.force) {
        this.log("dropp.config.json already exists. Use --force to overwrite.");
        return;
      }
    } catch {
      // ignore missing file
    }

    await writeFile(configPath, JSON.stringify(defaultConfig, null, 2), "utf8");
    this.log("Configuration initialized.");
    this.log(configPath);
  }
}
