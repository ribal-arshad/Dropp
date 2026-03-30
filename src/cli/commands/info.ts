import { Args, Command, Flags } from "@oclif/core";
import { loadConfig } from "../../config/index.js";
import { resolveRepository } from "../utils/repository.js";

export default class Info extends Command {
  static override description = "Show detailed media information";

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
    const { args, flags } = await this.parse(Info);
    const { config } = await loadConfig(process.cwd());
    const repository = await resolveRepository(config, process.cwd());

    const item = await repository.findById(args.id);

    if (!item) {
      this.error(`Media not found: ${args.id}`, { exit: 1 });
    }

    if (flags.json) {
      this.log(JSON.stringify(item, null, 2));
      return;
    }

    this.log(`id: ${item.id}`);
    this.log(`tenantId: ${item.tenantId ?? "default"}`);
    this.log(`model: ${item.model}`);
    this.log(`modelId: ${item.modelId}`);
    this.log(`collection: ${item.collection}`);
    this.log(`fileName: ${item.fileName}`);
    this.log(`mimeType: ${item.mimeType}`);
    this.log(`size: ${item.size}`);
    this.log(`disk: ${item.disk}`);
    this.log(`path: ${item.path}`);
    this.log(`url: ${item.url}`);
    this.log(`createdAt: ${new Date(item.createdAt).toISOString()}`);
    this.log(`metadata: ${JSON.stringify(item.metadata ?? {}, null, 2)}`);
  }
}
