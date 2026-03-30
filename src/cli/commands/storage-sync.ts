import { Command, Flags } from "@oclif/core";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadConfig } from "../../config/index.js";
import { resolveRepository } from "../utils/repository.js";
import { createStorageDriver } from "../utils/storage.js";

export default class StorageSync extends Command {
  static override description =
    "Sync local media files to the configured cloud storage backend";

  static override flags = {
    fromDir: Flags.string({
      description: "Base local media directory",
      default: "media",
    }),
    dryRun: Flags.boolean({
      description: "Preview synchronization without uploading",
      default: false,
    }),
    retryAttempts: Flags.integer({
      description: "Retry attempts per file",
      default: 3,
    }),
    json: Flags.boolean({
      description: "Print JSON output",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(StorageSync);
    const cwd = process.cwd();
    const { config } = await loadConfig(cwd);
    const repository = await resolveRepository(config, cwd);

    if (!repository.all) {
      throw new Error(
        "storage-sync requires repository.all() support to enumerate media records.",
      );
    }

    const items = await repository.all();
    const storage = createStorageDriver(config);

    const results: Array<Record<string, unknown>> = [];

    for (const item of items) {
      const sourcePath = join(cwd, flags.fromDir, item.path);

      if (flags.dryRun) {
        results.push({ id: item.id, path: item.path, dryRun: true });
        continue;
      }

      let attempt = 0;
      let success = false;

      while (attempt < flags.retryAttempts && !success) {
        try {
          const content = await readFile(sourcePath);
          await storage.upload(new Uint8Array(content), item.path);
          results.push({ id: item.id, path: item.path, synced: true });
          success = true;
        } catch (error) {
          attempt += 1;
          if (attempt >= flags.retryAttempts) {
            const msg = error instanceof Error ? error.message : String(error);
            results.push({ id: item.id, path: item.path, error: msg });
          } else {
            await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempt)));
          }
        }
      }
    }

    if (flags.json) {
      this.log(JSON.stringify(results, null, 2));
      return;
    }

    const synced = results.filter((r) => r.synced).length;
    const failed = results.filter((r) => r.error).length;
    this.log(`Synced: ${synced}, Failed: ${failed}, Total: ${results.length}`);
  }
}
