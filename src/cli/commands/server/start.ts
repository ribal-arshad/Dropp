import { Command, Flags } from "@oclif/core";
import { createServer, IncomingMessage, ServerResponse } from "node:http";
import { basename, join } from "node:path";
import { readFile } from "node:fs/promises";
import { lookup as mimeLookup } from "mime-types";
import { loadConfig } from "../../../config/index.js";
import { Dropp } from "../../../core/index.js";
import { resolveRepository } from "../../utils/repository.js";
import { createStorageDriver } from "../../utils/storage.js";

type AttachBody = {
  filePath: string;
  model: string;
  modelId: string;
  tenantId?: string;
  collection?: string;
  metadata?: Record<string, unknown>;
};

export default class ServerStart extends Command {
  static override description = "Run HTTP API server mode alongside CLI";

  static override flags = {
    port: Flags.integer({
      description: "Server port",
      default: 8787,
      min: 1,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ServerStart);
    const cwd = process.cwd();
    const { config } = await loadConfig(cwd);
    const repository = await resolveRepository(config, cwd);
    const storage = createStorageDriver(config);
    const dropp = new Dropp({ repository, storage });

    const server = createServer(async (req, res) => {
      try {
        await this.route(req, res, dropp, cwd);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.json(res, 500, { error: msg });
      }
    });

    await new Promise<void>((resolve) => server.listen(flags.port, resolve));
    this.log(`Dropp API server running on http://localhost:${flags.port}`);
    this.log(
      "Routes: GET /health, GET /media/:id, DELETE /media/:id, POST /media",
    );
  }

  private async route(
    req: IncomingMessage,
    res: ServerResponse,
    dropp: Dropp,
    cwd: string,
  ): Promise<void> {
    const method = req.method ?? "GET";
    const url = new URL(req.url ?? "/", "http://localhost");

    if (method === "GET" && url.pathname === "/health") {
      this.json(res, 200, { ok: true, service: "dropp-api" });
      return;
    }

    if (method === "POST" && url.pathname === "/media") {
      const body = (await this.readJson(req)) as AttachBody;
      const absolutePath = join(cwd, body.filePath);
      const bytes = await readFile(absolutePath);
      const fileName = basename(absolutePath);
      const mimeType = (
        mimeLookup(fileName) || "application/octet-stream"
      ).toString();

      const media = await dropp.attach({
        file: new Uint8Array(bytes),
        fileName,
        mimeType,
        model: body.model,
        modelId: body.modelId,
        tenantId: body.tenantId,
        collection: body.collection,
        metadata: body.metadata,
      });

      this.json(res, 201, media);
      return;
    }

    if (url.pathname.startsWith("/media/")) {
      const id = url.pathname.replace("/media/", "");

      if (method === "GET") {
        const media = await dropp.get(id);
        if (!media) {
          this.json(res, 404, { error: "Not found" });
          return;
        }
        this.json(res, 200, media);
        return;
      }

      if (method === "DELETE") {
        await dropp.delete(id);
        this.json(res, 200, { deleted: true, id });
        return;
      }
    }

    this.json(res, 404, { error: "Route not found" });
  }

  private async readJson(req: IncomingMessage): Promise<unknown> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const body = Buffer.concat(chunks).toString("utf8");
    return body ? JSON.parse(body) : {};
  }

  private json(res: ServerResponse, status: number, payload: unknown): void {
    res.statusCode = status;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(payload));
  }
}
