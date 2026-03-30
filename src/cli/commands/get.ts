import { Args, Command, Flags } from "@oclif/core";
import { loadConfig } from "../../config/index.js";
import { resolveRepository } from "../utils/repository.js";

export default class Get extends Command {
  static override description =
    "Get a media item by id from local metadata store";

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
    const { args, flags } = await this.parse(Get);
    const { config } = await loadConfig(process.cwd());
    const repository = await resolveRepository(config, process.cwd());

    const item = await repository.findById(args.id);

    if (!item) {
      this.log(`Media not found: ${args.id}`);
      return;
    }

    if (flags.json) {
      this.log(JSON.stringify(item, null, 2));
      return;
    }

    this.log(`id: ${item.id}`);
    this.log(`tenantId: ${item.tenantId ?? "default"}`);
    this.log(`model: ${item.model}`);
    this.log(`modelId: ${item.modelId}`);
    this.log(`fileName: ${item.fileName}`);
    this.log(`mimeType: ${item.mimeType}`);
    this.log(`url: ${item.url}`);
    this.log(`path: ${item.path}`);
  }
}
