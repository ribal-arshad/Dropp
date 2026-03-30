import { z } from "zod";
import type { DroppConfig } from "../types/index.js";
import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { config as loadDotEnv } from "dotenv";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let yamlParser: { load: (content: string) => unknown } | undefined;
try {
  yamlParser = require("js-yaml") as { load: (content: string) => unknown };
} catch {
  // yaml optional
}

loadDotEnv();

export const droppConfigSchema = z.object({
  orm: z.object({
    driver: z.enum([
      "json",
      "prisma",
      "typeorm",
      "drizzle",
      "sequelize",
      "mikroorm",
      "mongoose",
      "kysely",
      "custom",
    ]),
    repository: z
      .object({
        module: z.string(),
        exportName: z.string().optional(),
        options: z.record(z.unknown()).optional(),
      })
      .optional(),
  }),
  storage: z.object({
    driver: z.enum(["local", "s3", "r2", "azure", "gcs"]),
    local: z
      .object({
        baseDir: z.string().optional(),
        baseUrl: z.string().optional(),
      })
      .optional(),
    s3: z
      .object({
        bucket: z.string(),
        region: z.string(),
        endpoint: z.string().optional(),
        forcePathStyle: z.boolean().optional(),
        publicBaseUrl: z.string().optional(),
      })
      .optional(),
    r2: z
      .object({
        accountId: z.string(),
        bucket: z.string(),
        region: z.string().optional(),
        endpoint: z.string().optional(),
        forcePathStyle: z.boolean().optional(),
        publicBaseUrl: z.string().optional(),
      })
      .optional(),
    azure: z
      .object({
        connectionString: z.string(),
        container: z.string(),
        publicBaseUrl: z.string().optional(),
      })
      .optional(),
    gcs: z
      .object({
        bucket: z.string(),
        projectId: z.string().optional(),
        keyFilename: z.string().optional(),
        publicBaseUrl: z.string().optional(),
      })
      .optional(),
  }),
  queue: z.object({
    enabled: z.boolean(),
    driver: z.enum(["bullmq"]).optional(),
  }),
  cdn: z
    .object({
      enabled: z.boolean().optional(),
      provider: z.enum(["cloudflare", "webhook"]).optional(),
      cloudflare: z
        .object({
          zoneId: z.string(),
          apiToken: z.string(),
        })
        .optional(),
      webhook: z
        .object({
          endpoint: z.string(),
          authHeader: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  presets: z
    .object({
      imageQuality: z.enum(["balanced", "high", "small"]).optional(),
      responsivePreset: z
        .enum(["mobile", "tablet", "desktop", "universal"])
        .optional(),
      optimizeOnUpload: z.boolean().optional(),
    })
    .optional(),
});

export function defineConfig(config: DroppConfig): DroppConfig {
  return droppConfigSchema.parse(config) as DroppConfig;
}

export type DroppConfigLoadResult = {
  configPath: string;
  config: DroppConfig;
};

export async function loadConfig(
  cwd: string = process.cwd(),
): Promise<DroppConfigLoadResult> {
  const envConfig = loadEnvConfig();

  const configFiles = [
    { name: "dropp.config.json", parser: JSON.parse },
    { name: "dropp.config.yaml", parser: (c: string) => yamlParser?.load(c) },
    { name: "dropp.config.yml", parser: (c: string) => yamlParser?.load(c) },
  ];

  for (const file of configFiles) {
    const configPath = join(cwd, file.name);
    try {
      await access(configPath, constants.F_OK);
      const raw = await readFile(configPath, "utf8");
      const parsed = file.parser(raw) as DroppConfig;
      const merged = mergeConfigs(parsed, envConfig);
      return {
        configPath,
        config: defineConfig(merged),
      };
    } catch {
      // Try next file
    }
  }

  if (Object.keys(envConfig).length > 0) {
    return {
      configPath: "env:DROPP_*",
      config: defineConfig(mergeConfigs({}, envConfig)),
    };
  }

  throw new Error(
    "No config file found. Create dropp.config.json, dropp.config.yaml, or set DROPP_* env vars.",
  );
}

function loadEnvConfig(): Partial<DroppConfig> {
  const config: any = {};

  if (process.env.DROPP_ORM_DRIVER) {
    config.orm = { driver: process.env.DROPP_ORM_DRIVER };
  }
  if (process.env.DROPP_STORAGE_DRIVER) {
    config.storage = { driver: process.env.DROPP_STORAGE_DRIVER };
  }
  if (process.env.DROPP_STORAGE_LOCAL_BASEDIR) {
    config.storage ??= {};
    config.storage.local = { baseDir: process.env.DROPP_STORAGE_LOCAL_BASEDIR };
  }
  if (process.env.DROPP_STORAGE_S3_BUCKET) {
    config.storage ??= {};
    config.storage.s3 = {
      bucket: process.env.DROPP_STORAGE_S3_BUCKET,
      region: process.env.DROPP_STORAGE_S3_REGION || "us-east-1",
    };
  }
  if (process.env.DROPP_QUEUE_ENABLED) {
    config.queue = { enabled: process.env.DROPP_QUEUE_ENABLED === "true" };
  }
  if (process.env.DROPP_CDN_PROVIDER) {
    config.cdn = {
      enabled: true,
      provider: process.env.DROPP_CDN_PROVIDER as "cloudflare" | "webhook",
    };
  }
  if (process.env.DROPP_CF_ZONE_ID && process.env.DROPP_CF_API_TOKEN) {
    config.cdn ??= { enabled: true, provider: "cloudflare" };
    config.cdn.cloudflare = {
      zoneId: process.env.DROPP_CF_ZONE_ID,
      apiToken: process.env.DROPP_CF_API_TOKEN,
    };
  }
  if (process.env.DROPP_CDN_WEBHOOK) {
    config.cdn ??= { enabled: true, provider: "webhook" };
    config.cdn.webhook = {
      endpoint: process.env.DROPP_CDN_WEBHOOK,
      authHeader: process.env.DROPP_CDN_WEBHOOK_AUTH,
    };
  }

  return config;
}

function mergeConfigs(
  fileConfig: Partial<DroppConfig>,
  envConfig: Partial<DroppConfig>,
): DroppConfig {
  const fileAny = fileConfig as Record<string, unknown>;
  const envAny = envConfig as Record<string, unknown>;

  return {
    orm: { ...fileConfig.orm, ...envConfig.orm },
    storage: { ...fileConfig.storage, ...envConfig.storage },
    queue: { ...fileConfig.queue, ...envConfig.queue },
    cdn: {
      ...(fileAny["cdn"] as Record<string, unknown> | undefined),
      ...(envAny["cdn"] as Record<string, unknown> | undefined),
    },
    presets: {
      ...(fileAny["presets"] as Record<string, unknown> | undefined),
      ...(envAny["presets"] as Record<string, unknown> | undefined),
    },
  } as DroppConfig;
}

export async function loadConfigLegacy(
  cwd: string = process.cwd(),
): Promise<DroppConfigLoadResult> {
  const configPath = join(cwd, "dropp.config.json");
  await access(configPath, constants.F_OK);
  const raw = await readFile(configPath, "utf8");
  const parsed = JSON.parse(raw) as DroppConfig;

  return {
    configPath,
    config: defineConfig(parsed),
  };
}
