import { Command } from "@oclif/core";

export default class Config extends Command {
  static override description = "Manage Dropp configuration";

  public async run(): Promise<void> {
    this.log("Use one of the subcommands:");
    this.log("- dropp config:init [--force]");
    this.log("- dropp config:show [--json]");
    this.log("- dropp config:validate [--json]");
  }
}
