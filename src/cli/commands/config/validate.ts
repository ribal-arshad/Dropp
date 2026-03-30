import { Command, Flags } from "@oclif/core";
import { loadConfig } from "../../../config/index.js";

export default class ConfigValidate extends Command {
  static override description =
    "Validate dropp.config.json schema and required values";

  static override flags = {
    json: Flags.boolean({
      description: "Print JSON output",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ConfigValidate);

    try {
      const { configPath, config } = await loadConfig(process.cwd());

      const result = {
        valid: true,
        configPath,
        orm: config.orm.driver,
        storage: config.storage.driver,
        queueEnabled: config.queue.enabled,
      };

      if (flags.json) {
        this.log(JSON.stringify(result, null, 2));
        return;
      }

      this.log("Configuration is valid.");
      this.log(`Config path: ${configPath}`);
      this.log(`ORM: ${config.orm.driver}`);
      this.log(`Storage: ${config.storage.driver}`);
      this.log(`Queue: ${config.queue.enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      const message = (error as Error).message;

      if (flags.json) {
        this.log(JSON.stringify({ valid: false, error: message }, null, 2));
        this.exit(1);
      } else {
        this.error(`Configuration is invalid: ${message}`, { exit: 1 });
      }
    }
  }
}
