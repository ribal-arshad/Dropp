import { Args, Command } from "@oclif/core";
import { access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import type { DroppConfig } from "../../../types/index.js";

export default class PluginRemove extends Command {
  static override description = "Remove an installed plugin";

  static override args = {
    name: Args.string({
      description: "Plugin name",
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { args } = await this.parse(PluginRemove);
    const pluginName = args.name;

    const configPath = join(process.cwd(), "dropp.config.json");

    try {
      await access(configPath, constants.F_OK);
      const raw = await readFile(configPath, "utf8");
      const dropp = JSON.parse(raw) as DroppConfig;

      if (!dropp.plugins?.[pluginName]) {
        throw new Error(`Plugin '${pluginName}' is not installed.`);
      }

      delete dropp.plugins[pluginName];

      await writeFile(configPath, JSON.stringify(dropp, null, 2), "utf8");

      this.log(`✓ Plugin '${pluginName}' removed from dropp.config.json`);
      this.log(`\nNext: Remove the npm package if no longer needed:`);
      this.log(`  pnpm remove @droppjs/plugin-${pluginName}`);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("dropp.config.json not found. Run `dropp init` first.");
    }
  }
}
