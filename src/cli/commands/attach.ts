import { Args, Command, Flags } from "@oclif/core";
import { basename, join } from "node:path";
import { readFile } from "node:fs/promises";
import { lookup as mimeLookup } from "mime-types";
import { loadConfig } from "../../config/index.js";
import { Dropp } from "../../core/index.js";
import { resolveRepository } from "../utils/repository.js";
import { createStorageDriver } from "../utils/storage.js";

export default class Attach extends Command {
  static override description =
    "Attach a local file to a model and store media metadata";

  static override args = {
    file: Args.string({
      description: "Path to the local file to attach",
      required: true,
    }),
  };

  static override flags = {
    model: Flags.string({
      description: "Model name (example: Post)",
      required: true,
    }),
    modelId: Flags.string({
      description: "Model id (example: 42)",
      required: true,
    }),
    tenantId: Flags.string({
      description: "Tenant id for multi-tenant isolation",
      default: "default",
    }),
    collection: Flags.string({
      description: "Collection name",
      default: "default",
    }),
    metadata: Flags.string({
      description: "JSON metadata object",
    }),
    json: Flags.boolean({
      description: "Print JSON output",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Attach);
    const { config } = await loadConfig(process.cwd());

    const filePath = join(process.cwd(), args.file);
    const fileBuffer = await readFile(filePath);
    const fileName = basename(filePath);
    const mimeType = (
      mimeLookup(fileName) || "application/octet-stream"
    ).toString();

    const metadata = flags.metadata
      ? (JSON.parse(flags.metadata) as Record<string, unknown>)
      : {};

    const storage = createStorageDriver(config);
    const repository = await resolveRepository(config, process.cwd());

    const dropp = new Dropp({
      storage,
      repository,
    });

    const media = await dropp.attach({
      file: new Uint8Array(fileBuffer),
      fileName,
      mimeType,
      model: flags.model,
      modelId: flags.modelId,
      tenantId: flags.tenantId,
      collection: flags.collection,
      metadata,
    });

    if (flags.json) {
      this.log(JSON.stringify(media, null, 2));
      return;
    }

    this.log("Attached successfully.");
    this.log(`id: ${media.id}`);
    this.log(`url: ${media.url}`);
    this.log(`path: ${media.path}`);
  }
}
