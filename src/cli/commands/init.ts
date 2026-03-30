import { Command, Flags } from "@oclif/core";
import { writeFile, mkdir, access } from "node:fs/promises";
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
};

export default class Init extends Command {
  static override description =
    "Initialize Dropp configuration in the current project";

  static override flags = {
    force: Flags.boolean({
      char: "f",
      description: "Overwrite existing dropp.config.json",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Init);
    const configPath = join(process.cwd(), "dropp.config.json");

    try {
      await access(configPath, constants.F_OK);
      if (!flags.force) {
        this.log("dropp.config.json already exists. Use --force to overwrite.");
        return;
      }
    } catch {
      // File does not exist, continuing..
    }

    await mkdir(process.cwd(), { recursive: true });
    await writeFile(configPath, JSON.stringify(defaultConfig, null, 2), "utf8");
    this.log("Dropp initialized successfully.");
  }
}
