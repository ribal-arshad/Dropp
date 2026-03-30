import { Args, Command, Flags } from "@oclif/core";
import { access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import type { DroppConfig } from "../../../types/index.js";

const AVAILABLE_PLUGINS = {
  watermark: {
    description: "Add watermarks to images",
    package: "@droppjs/plugin-watermark",
    defaultConfig: {
      text: "© My Brand",
      position: "bottomRight",
      opacity: 0.7,
    },
  },
  "ai-tagging": {
    description: "Automatically tag media using AI",
    package: "@droppjs/plugin-ai-tagging",
    defaultConfig: {
      provider: "openai",
      maxTags: 10,
      confidenceThreshold: 0.7,
    },
  },
  seo: {
    description: "Generate SEO-friendly metadata",
    package: "@droppjs/plugin-seo",
    defaultConfig: {
      generateAltText: true,
      generateDescription: true,
      addImageSitemap: true,
    },
  },
} as const;

export default class PluginInstall extends Command {
  static override description = "Install a plugin";

  static override args = {
    name: Args.string({
      description: "Plugin name",
      required: true,
      options: Object.keys(AVAILABLE_PLUGINS),
    }),
  };

  static override flags = {
    config: Flags.string({
      description: "Plugin configuration as JSON",
      default: "{}",
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(PluginInstall);

    const pluginName = args.name as keyof typeof AVAILABLE_PLUGINS;
    const pluginInfo = AVAILABLE_PLUGINS[pluginName];

    if (!pluginInfo) {
      throw new Error(`Unknown plugin: ${pluginName}`);
    }

    let config = pluginInfo.defaultConfig;

    if (flags.config !== "{}") {
      try {
        config = JSON.parse(flags.config);
      } catch {
        throw new Error("Invalid JSON in --config flag");
      }
    }

    const configPath = join(process.cwd(), "dropp.config.json");

    try {
      await access(configPath, constants.F_OK);
      const raw = await readFile(configPath, "utf8");
      const dropp = JSON.parse(raw) as DroppConfig;

      if (!dropp.plugins) {
        dropp.plugins = {};
      }

      if (dropp.plugins[pluginName]) {
        throw new Error(`Plugin '${pluginName}' is already installed.`);
      }

      dropp.plugins[pluginName] = {
        enabled: true,
        config,
      };

      await writeFile(configPath, JSON.stringify(dropp, null, 2), "utf8");

      this.log(
        `✓ Plugin '${pluginName}' installed and configured in dropp.config.json`,
      );
      this.log(`  Package: ${pluginInfo.package}`);
      this.log(`  Description: ${pluginInfo.description}`);
      this.log("\nNext: Install the npm package:");
      this.log(`  pnpm add ${pluginInfo.package}`);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("dropp.config.json not found. Run `dropp init` first.");
    }
  }
}
