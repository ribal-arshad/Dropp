import { Command, Flags } from "@oclif/core";
import { watch as fsWatch, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { lookup as mimeLookup } from "mime-types";
import { loadConfig } from "../../config/index.js";
import { Dropp } from "../../core/index.js";
import { resolveRepository } from "../utils/repository.js";
import { createStorageDriver } from "../utils/storage.js";

export default class Watch extends Command {
  static override description =
    "Watch a directory and auto-attach newly created files";

  static override flags = {
    dir: Flags.string({
      description: "Directory to watch",
      required: true,
    }),
    model: Flags.string({
      description: "Model name",
      required: true,
    }),
    modelId: Flags.string({
      description: "Model id",
      required: true,
    }),
    tenantId: Flags.string({
      description: "Tenant id",
      default: "default",
    }),
    collection: Flags.string({
      description: "Collection name",
      default: "default",
    }),
    retryAttempts: Flags.integer({
      description: "Retry attempts per file",
      default: 3,
    }),
    retryDelay: Flags.integer({
      description: "Initial retry delay in ms",
      default: 100,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Watch);
    const cwd = process.cwd();
    const targetDir = join(cwd, flags.dir);

    const { config } = await loadConfig(cwd);
    const repository = await resolveRepository(config, cwd);
    const storage = createStorageDriver(config);
    const dropp = new Dropp({ repository, storage });

    this.log(`Watching ${targetDir}`);

    const processedFiles = new Set<string>();

    for await (const event of fsWatch(targetDir)) {
      if (event.eventType !== "rename" || !event.filename) continue;

      const fullPath = join(targetDir, event.filename);
      if (processedFiles.has(fullPath)) continue;

      let attempt = 0;
      let delay = flags.retryDelay;

      while (attempt < flags.retryAttempts) {
        try {
          const fileBuffer = await readFile(fullPath);
          const fileName = basename(fullPath);
          const mimeType = (
            mimeLookup(fileName) || "application/octet-stream"
          ).toString();

          const media = await dropp.attach({
            file: new Uint8Array(fileBuffer),
            fileName,
            mimeType,
            model: flags.model,
            modelId: flags.modelId,
            tenantId: flags.tenantId,
            collection: flags.collection,
          });

          this.log(`✓ ${fileName} -> ${media.id}`);
          processedFiles.add(fullPath);
          break;
        } catch (error) {
          attempt += 1;
          if (attempt >= flags.retryAttempts) {
            const msg = error instanceof Error ? error.message : String(error);
            this.log(`✗ Failed ${event.filename}: ${msg}`);
          } else {
            await new Promise((r) => setTimeout(r, delay));
            delay = Math.min(delay * 2, 5000);
          }
        }
      }
    }
  }
}
