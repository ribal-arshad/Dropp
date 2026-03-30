import { Command, Flags } from "@oclif/core";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import type { DroppConfig } from "../../../types/index.js";

export default class PluginList extends Command {
  static override description = "List installed plugins";

  static override flags = {
    json: Flags.boolean({
      description: "Output as JSON",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(PluginList);

    const configPath = join(process.cwd(), "dropp.config.json");

    try {
      await access(configPath, constants.F_OK);
      const raw = await readFile(configPath, "utf8");
      const config = JSON.parse(raw) as DroppConfig;

      const plugins = config.plugins ?? {};
      const pluginList = Object.entries(plugins).map(([name, settings]) => ({
        name,
        enabled: settings.enabled ?? true,
        config: settings.config ?? {},
      }));

      if (flags.json) {
        this.log(JSON.stringify(pluginList, null, 2));
      } else {
        if (pluginList.length === 0) {
          this.log("No plugins installed.");
          return;
        }

        this.log("\n📦 Installed Plugins:\n");
        for (const plugin of pluginList) {
          const status = plugin.enabled ? "✓" : "✗";
          this.log(
            `${status} ${plugin.name} ${Object.keys(plugin.config).length > 0 ? "(configured)" : ""}`,
          );
        }
        this.log("");
      }
    } catch {
      this.log(
        "No plugins configured. Run `dropp plugin install` to add plugins.",
      );
    }
  }
}
