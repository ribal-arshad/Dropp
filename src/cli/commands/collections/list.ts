import { Command, Flags } from "@oclif/core";
import { readCollections } from "../../utils/collections.js";

export default class CollectionsList extends Command {
  static override description = "List all media collections";

  static override flags = {
    json: Flags.boolean({
      description: "Print JSON output",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(CollectionsList);
    const collections = await readCollections(process.cwd());

    if (flags.json) {
      this.log(JSON.stringify(collections, null, 2));
      return;
    }

    if (collections.length === 0) {
      this.log("No collections found.");
      return;
    }

    this.log(`Found ${collections.length} collection(s):`);
    for (const collection of collections) {
      this.log(
        `- ${collection.id} | ${collection.name} | media: ${collection.mediaIds.length}`,
      );
    }
  }
}
