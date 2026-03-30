import { Args, Command, Flags } from "@oclif/core";
import { loadConfig } from "../../../config/index.js";
import { resolveRepository } from "../../utils/repository.js";
import {
  findCollectionById,
  readCollections,
  touchCollection,
  writeCollections,
} from "../../utils/collections.js";

export default class CollectionsAddMedia extends Command {
  static override description = "Add a media item to a collection";

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
    const { args, flags } = await this.parse(CollectionsAddMedia);
    const cwd = process.cwd();

    const collections = await readCollections(cwd);
    const collection = findCollectionById(collections, args.collectionId);
    if (!collection) {
      throw new Error(`Collection not found: ${args.collectionId}`);
    }

    const { config } = await loadConfig(cwd);
    const repository = await resolveRepository(config, cwd);
    const media = await repository.findById(args.mediaId);
    if (!media) {
      throw new Error(`Media not found: ${args.mediaId}`);
    }

    if (!collection.mediaIds.includes(args.mediaId)) {
      collection.mediaIds.push(args.mediaId);
    }

    const updated = touchCollection(collection);
    const next = collections.map((entry) =>
      entry.id === updated.id ? updated : entry,
    );

    await writeCollections(cwd, next);

    if (flags.json) {
      this.log(JSON.stringify(updated, null, 2));
      return;
    }

    this.log(`Added media '${args.mediaId}' to collection '${updated.name}'.`);
  }
}
