import { Args, Command, Flags } from "@oclif/core";
import { loadConfig } from "../../config/index.js";
import { Dropp } from "../../core/index.js";
import { resolveRepository } from "../utils/repository.js";
import { createStorageDriver } from "../utils/storage.js";

export default class Remove extends Command {
  static override description = "Remove a media item by id";

  static override args = {
    id: Args.string({
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
    const { args, flags } = await this.parse(Remove);
    const { config } = await loadConfig(process.cwd());
    const repository = await resolveRepository(config, process.cwd());
    const storage = createStorageDriver(config);

    const dropp = new Dropp({ repository, storage });
    const existing = await repository.findById(args.id);

    if (!existing) {
      this.error(`Media not found: ${args.id}`, { exit: 1 });
    }

    await dropp.delete(args.id);

    if (flags.json) {
      this.log(JSON.stringify({ deleted: true, id: args.id }, null, 2));
      return;
    }

    this.log(`Deleted media: ${args.id}`);
  }
}
