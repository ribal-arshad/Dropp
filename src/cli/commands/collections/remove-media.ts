import { Args, Command, Flags } from "@oclif/core";
import {
  findCollectionById,
  readCollections,
  touchCollection,
  writeCollections,
} from "../../utils/collections.js";

export default class CollectionsRemoveMedia extends Command {
  static override description = "Remove a media item from a collection";

  static override args = {
    collectionId: Args.string({
      description: "Collection id",
      required: true,
    }),
    mediaId: Args.string({
      description: "Media id",
      required: true,
    }),
  };

  static override flags = {
    json: Flags.boolean({
      description: "Print JSON output",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(CollectionsRemoveMedia);
    const cwd = process.cwd();

    const collections = await readCollections(cwd);
    const collection = findCollectionById(collections, args.collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${args.collectionId}`);
    }

    const nextMediaIds = collection.mediaIds.filter(
      (id) => id !== args.mediaId,
    );
    const updated = touchCollection({ ...collection, mediaIds: nextMediaIds });

    const next = collections.map((entry) =>
      entry.id === updated.id ? updated : entry,
    );

    await writeCollections(cwd, next);

    if (flags.json) {
      this.log(JSON.stringify(updated, null, 2));
      return;
    }

    this.log(
      `Removed media '${args.mediaId}' from collection '${updated.name}'.`,
    );
  }
}
