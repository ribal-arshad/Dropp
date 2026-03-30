import type {
  AttachInput,
  Media,
  ReplaceInput,
  ReplaceOptions,
  FileInput,
  BatchAttachResult,
} from "../types/index.js";
import { createHash } from "node:crypto";
import type {
  MediaPlugin,
  MediaRepository,
  QueueDriver,
  StorageDriver,
  TransformationDriver,
} from "./contracts.js";

export type DroppDependencies = {
  repository: MediaRepository;
  storage: StorageDriver;
  transformer?: TransformationDriver;
  queue?: QueueDriver;
  plugins?: MediaPlugin[];
};

export class Dropp {
  private static readonly DOCUMENT_MIME_TYPES = new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/rtf",
    "text/plain",
    "text/csv",
    "application/json",
    "application/xml",
    "text/xml",
  ]);

  private static readonly DOCUMENT_EXTENSIONS = new Set([
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "txt",
    "csv",
    "rtf",
    "json",
    "xml",
  ]);

  private readonly plugins: MediaPlugin[];

  constructor(private readonly deps: DroppDependencies) {
    this.plugins = deps.plugins ?? [];
  }

  async attach(input: AttachInput): Promise<Media> {
    for (const plugin of this.plugins) {
      await plugin.beforeUpload?.(input);
    }

    const tenantId = input.tenantId ?? "default";
    const contentHash = this.tryHash(input.file);
    const mediaKind = this.inferMediaKind(input.mimeType, input.fileName);
    const metadata: Record<string, unknown> = {
      ...(input.metadata ?? {}),
      mediaKind,
      ...(contentHash ? { contentHash } : {}),
    };

    const sameModel = await this.deps.repository.findByModel(
      input.model,
      input.modelId,
    );
    const sameScope = sameModel.filter(
      (item) =>
        (item.tenantId ?? "default") === tenantId &&
        item.collection === (input.collection ?? "default"),
    );

    if (contentHash) {
      const duplicate = sameScope.find(
        (item) =>
          (item.metadata?.contentHash as string | undefined) === contentHash,
      );

      if (duplicate) {
        return duplicate;
      }
    }

    const sameName = sameScope
      .filter((item) => item.fileName === input.fileName)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const previous = sameName[0];
    const previousVersion = Number(previous?.metadata?.version ?? 0);
    metadata.version = previousVersion + 1;
    metadata.active = true;
    if (previous) metadata.previousVersionId = previous.id;

    const basePath = `${input.model}/${input.modelId}/${Date.now()}-${input.fileName}`;
    const storagePath = await this.deps.storage.upload(input.file, basePath);

    if (input.transformations?.length && this.deps.queue) {
      await this.deps.queue.add("media.transform", {
        path: storagePath,
        mimeType: input.mimeType,
        transformations: input.transformations,
      });
    }

    const media = await this.deps.repository.create({
      model: input.model,
      modelId: input.modelId,
      tenantId,
      collection: input.collection ?? "default",
      fileName: input.fileName,
      mimeType: input.mimeType,
      size: 0,
      disk: "default",
      path: storagePath,
      url: this.deps.storage.getUrl(storagePath),
      metadata,
    });

    if (previous && this.deps.repository.update) {
      await this.deps.repository.update(previous.id, {
        metadata: {
          ...previous.metadata,
          active: false,
        },
      });
    }

    for (const plugin of this.plugins) {
      await plugin.afterUpload?.(media);
    }

    return media;
  }

  get(id: string): Promise<Media | null> {
    return this.deps.repository.findById(id);
  }

  getByModel(model: string, modelId: string): Promise<Media[]> {
    return this.deps.repository.findByModel(model, modelId);
  }

  /**
   * Get all media for a model/modelId filtered by collection.
   */
  async getByCollection(
    model: string,
    modelId: string,
    collection?: string,
  ): Promise<Media[]> {
    const all = await this.deps.repository.findByModel(model, modelId);
    if (!collection) return all;
    return all.filter((m) => m.collection === collection);
  }

  /**
   * Query media with filtering, sorting, and pagination.
   */
  async list(query: {
    model?: string;
    modelId?: string;
    collection?: string;
    limit?: number;
    offset?: number;
    sort?: "createdAt:asc" | "createdAt:desc";
  }): Promise<Media[]> {
    let results: Media[] = [];

    if (query.model && query.modelId) {
      results = await this.deps.repository.findByModel(
        query.model,
        query.modelId,
      );
    }

    // Filter by collection
    if (query.collection) {
      results = results.filter((m) => m.collection === query.collection);
    }

    // Sort
    if (query.sort === "createdAt:desc") {
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } else if (query.sort === "createdAt:asc") {
      results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    // Paginate
    const offset = query.offset ?? 0;
    const limit = query.limit ?? results.length;
    return results.slice(offset, offset + limit);
  }

  /**
   * Query media by metadata fields.
   * Matches if metadata contains all provided key-value pairs.
   */
  async getByMetadata(
    metadata: Record<string, unknown>,
    options?: { limit?: number },
  ): Promise<Media[]> {
    // Note: This is a naive implementation.
    // For production, implement efficient indexed metadata queries in repository.
    // For now, this assumes you'll override in your repository adapter.
    const results: Media[] = [];

    // This is a placeholder that works with simple filtering.
    // Real implementations would use database indexes.
    if ((this.deps.repository as any).findByMetadata) {
      return (this.deps.repository as any).findByMetadata(metadata, options);
    }

    // Fallback: return empty (implement in your repository)
    return results;
  }

  async delete(id: string): Promise<void> {
    const media = await this.deps.repository.findById(id);
    if (!media) return;

    await this.deps.storage.delete(media.path);
    await this.deps.repository.delete(id);
  }

  async replace(
    id: string,
    input: ReplaceInput,
    options: ReplaceOptions = {},
  ): Promise<Media> {
    const current = await this.deps.repository.findById(id);
    if (!current) {
      throw new Error(`Media not found: ${id}`);
    }

    const fileName = input.fileName ?? current.fileName;
    const mimeType = input.mimeType ?? current.mimeType;

    const attachLikeInput: AttachInput = {
      file: input.file,
      fileName,
      mimeType,
      model: current.model,
      modelId: current.modelId,
      tenantId: current.tenantId,
      collection: current.collection,
      metadata: input.metadata,
      transformations: input.transformations,
    };

    for (const plugin of this.plugins) {
      await plugin.beforeUpload?.(attachLikeInput);
    }

    const mediaKind = this.inferMediaKind(mimeType, fileName);
    const contentHash = this.tryHash(input.file);
    const nextVersion = Number(current.metadata?.version ?? 1) + 1;

    const metadata: Record<string, unknown> = {
      ...(input.metadata ?? {}),
      mediaKind,
      ...(contentHash ? { contentHash } : {}),
      version: options.version ? nextVersion : 1,
      active: true,
      ...(options.version ? { previousVersionId: current.id } : {}),
    };

    const basePath = `${current.model}/${current.modelId}/${Date.now()}-${fileName}`;
    const storagePath = await this.deps.storage.upload(input.file, basePath);

    if (input.transformations?.length && this.deps.queue) {
      await this.deps.queue.add("media.transform", {
        path: storagePath,
        mimeType,
        transformations: input.transformations,
      });
    }

    const created = await this.deps.repository.create({
      model: current.model,
      modelId: current.modelId,
      tenantId: current.tenantId ?? "default",
      collection: current.collection,
      fileName,
      mimeType,
      size: 0,
      disk: current.disk,
      path: storagePath,
      url: this.deps.storage.getUrl(storagePath),
      metadata,
    });

    if (options.version) {
      if (!this.deps.repository.update) {
        throw new Error(
          "Versioned replace requires repository.update() support.",
        );
      }

      await this.deps.repository.update(current.id, {
        metadata: {
          ...current.metadata,
          active: false,
        },
      });
    } else {
      await this.deps.storage.delete(current.path);
      await this.deps.repository.delete(current.id);
    }

    for (const plugin of this.plugins) {
      await plugin.afterUpload?.(created);
    }

    return created;
  }

  async rollback(id: string): Promise<Media> {
    const current = await this.deps.repository.findById(id);
    if (!current) {
      throw new Error(`Media not found: ${id}`);
    }

    const previousId = current.metadata?.previousVersionId as
      | string
      | undefined;
    if (!previousId) {
      throw new Error(`Media ${id} has no previous version to rollback to.`);
    }

    const previous = await this.deps.repository.findById(previousId);
    if (!previous) {
      throw new Error(`Previous version not found: ${previousId}`);
    }

    if (!this.deps.repository.update) {
      throw new Error("Rollback requires repository.update() support.");
    }

    await this.deps.repository.update(current.id, {
      metadata: {
        ...current.metadata,
        active: false,
      },
    });

    const restored = await this.deps.repository.update(previous.id, {
      metadata: {
        ...previous.metadata,
        active: true,
      },
    });

    if (!restored) {
      throw new Error(`Failed to restore previous version: ${previous.id}`);
    }

    return restored;
  }

  /**
   * Upload multiple files at once.
   * Continues on individual failures; returns results + errors.
   */
  async attachMany(inputs: FileInput[]): Promise<BatchAttachResult> {
    const successful: Media[] = [];
    const failed: Array<{ input: FileInput; error: string }> = [];

    for (const input of inputs) {
      try {
        const media = await this.attach({
          ...input,
          tenantId: (input as any).tenantId ?? "default",
        } as AttachInput);
        successful.push(media);
      } catch (error) {
        failed.push({
          input,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    }

    return { successful, failed };
  }

  /**
   * Delete multiple media records at once.
   * Continues on individual failures; returns count of successful deletions.
   */
  async deleteMany(
    ids: string[],
  ): Promise<{ deleted: number; failed: string[] }> {
    const failed: string[] = [];
    let deleted = 0;

    for (const id of ids) {
      try {
        await this.delete(id);
        deleted++;
      } catch (error) {
        failed.push(id);
      }
    }

    return { deleted, failed };
  }

  private tryHash(file: unknown): string | undefined {
    if (file instanceof Uint8Array) {
      return createHash("sha256").update(file).digest("hex");
    }

    if (typeof Buffer !== "undefined" && Buffer.isBuffer(file)) {
      return createHash("sha256").update(file).digest("hex");
    }

    return undefined;
  }

  private inferMediaKind(
    mimeType: string,
    fileName?: string,
  ): "image" | "video" | "audio" | "document" | "other" {
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "audio";

    if (Dropp.DOCUMENT_MIME_TYPES.has(mimeType)) return "document";

    const extension = fileName?.split(".").pop()?.toLowerCase();
    if (extension && Dropp.DOCUMENT_EXTENSIONS.has(extension)) {
      return "document";
    }

    return "other";
  }
}
