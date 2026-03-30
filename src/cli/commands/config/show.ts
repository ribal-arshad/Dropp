import { Command, Flags } from "@oclif/core";
import { loadConfig } from "../../../config/index.js";

export default class ConfigShow extends Command {
  static override description = "Show the resolved Dropp configuration";

  static override flags = {
    json: Flags.boolean({
      description: "Print JSON output",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ConfigShow);
    const { configPath, config } = await loadConfig(process.cwd());

    if (flags.json) {
      this.log(JSON.stringify({ configPath, config }, null, 2));
      return;
    }

    this.log(`Config path: ${configPath}`);
    this.log(JSON.stringify(config, null, 2));
  }
}
