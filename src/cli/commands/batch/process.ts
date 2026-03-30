import { Args, Command, Flags } from "@oclif/core";
import { access, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { lookup as mimeLookup } from "mime-types";
import { Worker } from "node:worker_threads";
import { loadConfig } from "../../../config/index.js";
import { Dropp } from "../../../core/index.js";
import { resolveRepository } from "../../utils/repository.js";
import { createStorageDriver } from "../../utils/storage.js";
import { constants } from "node:fs";

type BatchItem = {
  file: string;
  model: string;
  modelId: string;
  tenantId?: string;
  collection?: string;
  metadata?: Record<string, unknown>;
};

type BatchPayload = {
  items: BatchItem[];
};

type BatchCheckpoint = {
  sourceConfigFile: string;
  processedKeys: string[];
  failed: Array<{ key: string; file: string; error: string }>;
  updatedAt: string;
};

type BatchResult = {
  key: string;
  file: string;
  mediaId?: string;
  url?: string;
  preview?: boolean;
  skipped?: boolean;
  synced?: boolean;
  error?: string;
};

export default class BatchProcess extends Command {
  static override description =
    "Process and attach multiple files from a batch config JSON file";

  static override args = {
    configFile: Args.string({
      description: "Path to batch JSON file",
      required: true,
    }),
  };

  static override flags = {
    dryRun: Flags.boolean({
      description: "Preview operations without uploading",
      default: false,
    }),
    resume: Flags.boolean({
      description: "Resume from checkpoint file and skip processed items",
      default: false,
    }),
    checkpointFile: Flags.string({
      description: "Path to checkpoint file",
      default: ".dropp-batch-checkpoint.json",
    }),
    concurrency: Flags.integer({
      description: "Number of parallel workers",
      default: 1,
      min: 1,
    }),
    workerThreads: Flags.boolean({
      description: "Use worker threads for batch item processing",
      default: false,
    }),
    stopOnError: Flags.boolean({
      description: "Stop batch on first error (fail-fast for CI)",
      default: false,
    }),
    json: Flags.boolean({
      description: "Print JSON output",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(BatchProcess);
    const cwd = process.cwd();
    const checkpointPath = join(cwd, flags.checkpointFile);

    const raw = await readFile(join(cwd, args.configFile), "utf8");
    const payload = JSON.parse(raw) as BatchPayload;

    if (!Array.isArray(payload.items) || payload.items.length === 0) {
      throw new Error("Batch config must contain a non-empty 'items' array.");
    }

    const { config } = await loadConfig(cwd);
    const repository = await resolveRepository(config, cwd);
    const storage = createStorageDriver(config);
    const dropp = new Dropp({ repository, storage });

    const results: BatchResult[] = [];

    const checkpoint: BatchCheckpoint = {
      sourceConfigFile: args.configFile,
      processedKeys: [],
      failed: [],
      updatedAt: new Date().toISOString(),
    };

    let shouldStop = false;

    if (flags.resume) {
      try {
        await access(checkpointPath, constants.F_OK);
        const saved = JSON.parse(
          await readFile(checkpointPath, "utf8"),
        ) as BatchCheckpoint;
        checkpoint.processedKeys = saved.processedKeys ?? [];
        checkpoint.failed = saved.failed ?? [];
      } catch {
        // No checkpoint yet; continue from scratch.
      }
    }

    const total = payload.items.length;
    let processedCount = checkpoint.processedKeys.length;

    const saveCheckpoint = async () => {
      checkpoint.updatedAt = new Date().toISOString();
      await writeFile(
        checkpointPath,
        JSON.stringify(checkpoint, null, 2),
        "utf8",
      );
    };

    const runItem = async (item: BatchItem, index: number): Promise<void> => {
      const key = `${index}:${item.file}:${item.model}:${item.modelId}`;

      if (checkpoint.processedKeys.includes(key)) {
        results.push({ key, file: item.file, skipped: true });
        return;
      }

      this.log(
        `[${Math.min(processedCount + 1, total)}/${total}] ${item.file}`,
      );

      const absoluteFilePath = join(cwd, item.file);

      try {
        const fileBuffer = await readFile(absoluteFilePath);
        const fileName = basename(absoluteFilePath);
        const mimeType = (
          mimeLookup(fileName) || "application/octet-stream"
        ).toString();

        if (flags.dryRun) {
          results.push({
            key,
            file: item.file,
            preview: true,
          });
          checkpoint.processedKeys.push(key);
          processedCount += 1;
          await saveCheckpoint();
          return;
        }

        const media = await dropp.attach({
          file: new Uint8Array(fileBuffer),
          fileName,
          mimeType,
          model: item.model,
          modelId: item.modelId,
          tenantId: item.tenantId,
          collection: item.collection,
          metadata: item.metadata,
        });

        results.push({
          key,
          file: item.file,
          mediaId: media.id,
          url: media.url,
        });

        checkpoint.processedKeys.push(key);
        processedCount += 1;
        await saveCheckpoint();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        checkpoint.failed.push({ key, file: item.file, error: message });
        results.push({ key, file: item.file, error: message });
        await saveCheckpoint();
        if (flags.stopOnError) {
          shouldStop = true;
        }
      }
    };

    const workers = Math.min(flags.concurrency, payload.items.length);
    if (flags.workerThreads) {
      await this.runWorkerThreadMode({
        workers,
        payload,
        cwd,
        runItem,
        shouldStop: () => shouldStop,
      });
    } else {
      let nextIndex = 0;

      await Promise.all(
        Array.from({ length: workers }, async () => {
          while (nextIndex < payload.items.length && !shouldStop) {
            const current = nextIndex;
            nextIndex += 1;
            await runItem(payload.items[current], current);
          }
        }),
      );
    }

    if (shouldStop) {
      this.error("Batch stopped due to error. Resume with --resume", {
        exit: 1,
      });
    }

    const summary = {
      total,
      done: checkpoint.processedKeys.length,
      failed: checkpoint.failed.length,
      checkpointFile: flags.checkpointFile,
    };

    if (flags.json) {
      this.log(JSON.stringify({ summary, results }, null, 2));
      return;
    }

    this.log(`Processed ${summary.done}/${summary.total} item(s).`);
    if (summary.failed > 0) {
      this.log(`Failed: ${summary.failed}. Resume with --resume`);
    }
    for (const result of results) {
      this.log(`- ${JSON.stringify(result)}`);
    }
  }

  private async runWorkerThreadMode(input: {
    workers: number;
    payload: BatchPayload;
    cwd: string;
    runItem: (item: BatchItem, index: number) => Promise<void>;
    shouldStop: () => boolean;
  }): Promise<void> {
    const workerScript = new URL(
      "../../workers/batch-item.worker.js",
      import.meta.url,
    );

    let nextIndex = 0;
    await Promise.all(
      Array.from({ length: input.workers }, async () => {
        while (nextIndex < input.payload.items.length) {
          if (input.shouldStop()) break;
          const current = nextIndex;
          nextIndex += 1;
          const item = input.payload.items[current];

          await new Promise<void>((resolve, reject) => {
            const worker = new Worker(workerScript, {
              workerData: {
                cwd: input.cwd,
                file: item.file,
              },
            });

            worker.on("message", async (msg) => {
              if (msg?.ok) {
                await input.runItem(item, current);
                resolve();
              } else {
                reject(new Error(msg?.error ?? "Worker failed"));
              }
            });

            worker.on("error", reject);
            worker.on("exit", (code) => {
              if (code !== 0)
                reject(new Error(`Worker exited with code ${code}`));
            });
          });
        }
      }),
    );
  }
}
