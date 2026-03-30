export type MediaId = string;

export type MediaKind = "image" | "video" | "audio" | "document" | "other";

export type Transformation = {
  type: "resize" | "crop" | "webp" | "thumbnail" | "transcode";
  options?: Record<string, unknown>;
};

export type AttachInput = {
  file: unknown;
  fileName: string;
  mimeType: string;
  model: string;
  modelId: string;
  tenantId?: string;
  collection?: string;
  metadata?: Record<string, unknown>;
  transformations?: Transformation[];
};

export type ReplaceInput = {
  file: unknown;
  fileName?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
  transformations?: Transformation[];
};

export type ReplaceOptions = {
  version?: boolean;
};

export type FileInput = Omit<AttachInput, "tenantId">;

export type BatchAttachResult = {
  successful: Media[];
  failed: Array<{ input: FileInput; error: string }>;
};

export type MetadataQuery = {
  [key: string]: unknown;
};

export type Media = {
  id: MediaId;
  model: string;
  modelId: string;
  tenantId?: string;
  collection: string;
  fileName: string;
  mimeType: string;
  size: number;
  disk: string;
  path: string;
  url: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
};

export type MediaCreateInput = Omit<Media, "id" | "createdAt"> & {
  createdAt?: Date;
};

export type MediaQuery = {
  model?: string;
  modelId?: string;
  tenantId?: string;
  collection?: string;
  mimeTypePrefix?: string;
  fileNameContains?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  sort?: "createdAt:asc" | "createdAt:desc";
  limit?: number;
};

export type DroppConfig = {
  orm: {
    driver:
      | "json"
      | "prisma"
      | "typeorm"
      | "drizzle"
      | "sequelize"
      | "mikroorm"
      | "mongoose"
      | "kysely"
      | "custom";
    repository?: {
      module: string;
      exportName?: string;
      options?: Record<string, unknown>;
    };
  };
  storage: {
    driver: "local" | "s3" | "r2" | "azure" | "gcs";
    local?: {
      baseDir?: string;
      baseUrl?: string;
    };
    s3?: {
      bucket: string;
      region: string;
      endpoint?: string;
      forcePathStyle?: boolean;
      publicBaseUrl?: string;
    };
    r2?: {
      accountId: string;
      bucket: string;
      region?: string;
      endpoint?: string;
      forcePathStyle?: boolean;
      publicBaseUrl?: string;
    };
    azure?: {
      connectionString: string;
      container: string;
      publicBaseUrl?: string;
    };
    gcs?: {
      bucket: string;
      projectId?: string;
      keyFilename?: string;
      publicBaseUrl?: string;
    };
  };
  queue: {
    enabled: boolean;
    driver?: "bullmq";
  };
  cdn?: {
    enabled?: boolean;
    provider?: "cloudflare" | "webhook";
    cloudflare?: {
      zoneId: string;
      apiToken: string;
    };
    webhook?: {
      endpoint: string;
      authHeader?: string;
    };
  };
  presets?: {
    imageQuality?: "balanced" | "high" | "small";
    responsivePreset?: "mobile" | "tablet" | "desktop" | "universal";
    optimizeOnUpload?: boolean;
  };
  plugins?: {
    [pluginName: string]: {
      enabled?: boolean;
      config?: Record<string, unknown>;
    };
  };
};
