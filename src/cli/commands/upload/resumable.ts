import { Args, Command, Flags } from "@oclif/core";
import { mkdir, readFile, stat, writeFile, access, rm } from "node:fs/promises";
import { constants } from "node:fs";
import { basename, join } from "node:path";
import { lookup as mimeLookup } from "mime-types";
import { createHash } from "node:crypto";
import { loadConfig } from "../../../config/index.js";
import { Dropp } from "../../../core/index.js";
import { resolveRepository } from "../../utils/repository.js";
import { createStorageDriver } from "../../utils/storage.js";

type ResumableCheckpoint = {
  sourceFile: string;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  assembled?: boolean;
};

export default class UploadResumable extends Command {
  static override description = "Upload using chunked resumable flow";

  static override args = {
    file: Args.string({ description: "Local file path", required: true }),
  };

  static override flags = {
    model: Flags.string({ description: "Model name", required: true }),
    modelId: Flags.string({ description: "Model id", required: true }),
    tenantId: Flags.string({ description: "Tenant id", default: "default" }),
    collection: Flags.string({ description: "Collection", default: "default" }),
    chunkSizeMb: Flags.integer({
      description: "Chunk size MB",
      default: 5,
      min: 1,
    }),
    checkpointFile: Flags.string({
      description: "Checkpoint file path",
      default: ".dropp-upload-checkpoint.json",
    }),
    resume: Flags.boolean({
      description: "Resume from checkpoint",
      default: false,
    }),
    json: Flags.boolean({ description: "Print JSON output", default: false }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(UploadResumable);
    const cwd = process.cwd();
    const absolutePath = join(cwd, args.file);
    const chunkSize = flags.chunkSizeMb * 1024 * 1024;
    const checkpointPath = join(cwd, flags.checkpointFile);

    const { config } = await loadConfig(cwd);
    const repository = await resolveRepository(config, cwd);
    const storage = createStorageDriver(config);
    const dropp = new Dropp({ repository, storage });

    const fileStats = await stat(absolutePath);
    const totalChunks = Math.ceil(fileStats.size / chunkSize);

    let checkpoint: ResumableCheckpoint = {
      sourceFile: args.file,
      chunkSize,
      totalChunks,
      uploadedChunks: [],
    };

    if (flags.resume) {
      try {
        await access(checkpointPath, constants.F_OK);
        checkpoint = JSON.parse(
          await readFile(checkpointPath, "utf8"),
        ) as ResumableCheckpoint;
      } catch {
        // no checkpoint
      }
    }

    const fileBytes = await readFile(absolutePath);
    const uploadId = createHash("sha256")
      .update(fileBytes)
      .digest("hex")
      .slice(0, 16);
    const chunkDir = join(cwd, ".dropp", "chunks", uploadId);
    await mkdir(chunkDir, { recursive: true });

    for (let i = 0; i < totalChunks; i += 1) {
      if (checkpoint.uploadedChunks.includes(i)) continue;

      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileBytes.length);
      const chunk = fileBytes.subarray(start, end);
      await writeFile(join(chunkDir, `${i}.part`), chunk);
      checkpoint.uploadedChunks.push(i);
      await writeFile(
        checkpointPath,
        JSON.stringify(checkpoint, null, 2),
        "utf8",
      );
    }

    const assembledParts: Buffer[] = [];
    for (let i = 0; i < totalChunks; i += 1) {
      assembledParts.push(await readFile(join(chunkDir, `${i}.part`)));
    }
    const assembled = Buffer.concat(assembledParts);

    const fileName = basename(absolutePath);
    const mimeType = (
      mimeLookup(fileName) || "application/octet-stream"
    ).toString();

    const media = await dropp.attach({
      file: new Uint8Array(assembled),
      fileName,
      mimeType,
      model: flags.model,
      modelId: flags.modelId,
      tenantId: flags.tenantId,
      collection: flags.collection,
      metadata: {
        uploadMode: "resumable",
        totalChunks,
      },
    });

    checkpoint.assembled = true;
    await writeFile(
      checkpointPath,
      JSON.stringify(checkpoint, null, 2),
      "utf8",
    );

    await rm(chunkDir, { recursive: true, force: true });

    if (flags.json) {
      this.log(
        JSON.stringify(
          { media, checkpointFile: flags.checkpointFile },
          null,
          2,
        ),
      );
      return;
    }

    this.log(`Resumable upload complete: ${media.id}`);
    this.log(`url: ${media.url}`);
  }
}
