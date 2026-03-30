import { Command } from "@oclif/core";

export default class Collections extends Command {
  static override description = "Manage media collections";

  public async run(): Promise<void> {
    this.log("Use one of the subcommands:");
    this.log("- dropp collections:create <name>");
    this.log("- dropp collections:list [--json]");
    this.log("- dropp collections:add-media <collectionId> <mediaId>");
    this.log("- dropp collections:remove-media <collectionId> <mediaId>");
  }
}
