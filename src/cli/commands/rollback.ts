import { Args, Command, Flags } from "@oclif/core";
import { loadConfig } from "../../config/index.js";
import { Dropp } from "../../core/index.js";
import { resolveRepository } from "../utils/repository.js";
import { createStorageDriver } from "../utils/storage.js";

export default class Rollback extends Command {
  static override description = "Rollback a media record to previous version";

  static override args = {
    id: Args.string({ description: "Current media id", required: true }),
  };

  static override flags = {
    json: Flags.boolean({ description: "Print JSON output", default: false }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Rollback);
    const { config } = await loadConfig(process.cwd());
    const repository = await resolveRepository(config, process.cwd());
    const storage = createStorageDriver(config);
    const dropp = new Dropp({ repository, storage });
    const droppWithRollback = dropp as unknown as {
      rollback: (id: string) => Promise<{ id: string; url: string }>;
    };

    const restored = await droppWithRollback.rollback(args.id);

    if (flags.json) {
      this.log(JSON.stringify({ restored }, null, 2));
      return;
    }

    this.log(`Rolled back to media: ${restored.id}`);
    this.log(`url: ${restored.url}`);
  }
}
