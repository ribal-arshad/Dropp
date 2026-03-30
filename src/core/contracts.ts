import type { Media, MediaCreateInput, MediaQuery } from "../types/index.js";

export interface MediaRepository {
  create(data: MediaCreateInput): Promise<Media>;
  findById(id: string): Promise<Media | null>;
  findByModel(model: string, modelId: string): Promise<Media[]>;
  delete(id: string): Promise<void>;
  findMany?(query: MediaQuery): Promise<Media[]>;
  update?(id: string, patch: Partial<Media>): Promise<Media | null>;
}

export interface StorageDriver {
  upload(file: unknown, path: string): Promise<string>;
  delete(path: string): Promise<void>;
  getUrl(path: string): string;
}

export interface QueueDriver {
  add(job: string, payload: unknown): Promise<void>;
}

export interface MediaPlugin {
  name: string;
  version?: string;
  description?: string;
  beforeUpload?(context: unknown): Promise<void>;
  afterUpload?(media: Media): Promise<void>;
  beforeDelete?(context: unknown): Promise<void>;
  afterDelete?(context: unknown): Promise<void>;
  validate?(config: Record<string, unknown>): Promise<void>;
}

export interface TransformationDriver {
  transform(input: {
    sourcePath: string;
    mimeType: string;
    transformations: Array<{ type: string; options?: Record<string, unknown> }>;
  }): Promise<{ outputPath: string; metadata?: Record<string, unknown> }>;
}
