import { Command } from "@oclif/core";

export default class Plugin extends Command {
  static override description = "Manage Dropp plugins";

  static override args = {};

  static override flags = {};

  public async run(): Promise<void> {
    this.log("Use one of the following commands:");
    this.log("  dropp plugin install <name>   - Install a plugin");
    this.log("  dropp plugin list              - List installed plugins");
    this.log("  dropp plugin remove <name>     - Remove a plugin");
  }
}
