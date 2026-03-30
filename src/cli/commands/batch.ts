import { Command } from "@oclif/core";

export default class Batch extends Command {
  static override description = "Batch processing commands";

  public async run(): Promise<void> {
    this.log("Use one of the subcommands:");
    this.log("- dropp batch:process <configFile>");
  }
}
