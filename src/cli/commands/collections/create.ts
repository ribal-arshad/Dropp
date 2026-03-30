import { Args, Command, Flags } from "@oclif/core";
import {
  createCollection,
  findCollectionByName,
  readCollections,
  writeCollections,
} from "../../utils/collections.js";

export default class CollectionsCreate extends Command {
  static override description = "Create a new media collection";

  static override args = {
    name: Args.string({
      description: "Collection name",
      required: true,
    }),
  };

  static override flags = {
    description: Flags.string({
      description: "Collection description",
    }),
    customProperties: Flags.string({
      description: "JSON object for custom properties",
    }),
    json: Flags.boolean({
      description: "Print JSON output",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(CollectionsCreate);
    const cwd = process.cwd();

    const collections = await readCollections(cwd);
    const existing = findCollectionByName(collections, args.name);
    if (existing) {
      throw new Error(`Collection already exists with name '${args.name}'.`);
    }

    const customProperties = flags.customProperties
      ? (JSON.parse(flags.customProperties) as Record<string, unknown>)
      : undefined;

    const collection = createCollection({
      name: args.name,
      description: flags.description,
      customProperties,
    });

    await writeCollections(cwd, [...collections, collection]);

    if (flags.json) {
      this.log(JSON.stringify(collection, null, 2));
      return;
    }

    this.log("Collection created.");
    this.log(`id: ${collection.id}`);
    this.log(`name: ${collection.name}`);
  }
}
