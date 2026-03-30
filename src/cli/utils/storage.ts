import type { StorageDriver } from "../../core/index.js";
import type { DroppConfig } from "../../types/index.js";
import { LocalStorageDriver } from "../../storage/local/index.js";
import { S3StorageDriver } from "../../storage/s3/index.js";
import { R2StorageDriver } from "../../storage/r2/index.js";
import { AzureBlobStorageDriver } from "../../storage/azure/index.js";
import { GCSStorageDriver } from "../../storage/gcs/index.js";

export function createStorageDriver(config: DroppConfig): StorageDriver {
  if (config.storage.driver === "local") {
    const baseDir = config.storage.local?.baseDir ?? "media";
    const baseUrl = config.storage.local?.baseUrl ?? "/media";
    return new LocalStorageDriver(baseDir, baseUrl);
  }

  if (config.storage.driver === "s3") {
    if (!config.storage.s3) {
      throw new Error(
        "Missing `storage.s3` configuration for s3 driver in dropp.config.json.",
      );
    }

    return new S3StorageDriver({
      bucket: config.storage.s3.bucket,
      region: config.storage.s3.region,
      endpoint: config.storage.s3.endpoint,
      forcePathStyle: config.storage.s3.forcePathStyle,
      publicBaseUrl: config.storage.s3.publicBaseUrl,
    });
  }

  if (config.storage.driver === "r2") {
    if (!config.storage.r2) {
      throw new Error(
        "Missing `storage.r2` configuration for r2 driver in dropp.config.json.",
      );
    }

    return new R2StorageDriver({
      accountId: config.storage.r2.accountId,
      bucket: config.storage.r2.bucket,
      region: config.storage.r2.region ?? "auto",
      endpoint: config.storage.r2.endpoint,
      forcePathStyle: config.storage.r2.forcePathStyle,
      publicBaseUrl: config.storage.r2.publicBaseUrl,
    });
  }

  if (config.storage.driver === "azure") {
    if (!config.storage.azure) {
      throw new Error(
        "Missing `storage.azure` configuration for azure driver in dropp.config.json.",
      );
    }

    return new AzureBlobStorageDriver({
      connectionString: config.storage.azure.connectionString,
      container: config.storage.azure.container,
      publicBaseUrl: config.storage.azure.publicBaseUrl,
    });
  }

  if (config.storage.driver === "gcs") {
    if (!config.storage.gcs) {
      throw new Error(
        "Missing `storage.gcs` configuration for gcs driver in dropp.config.json.",
      );
    }

    return new GCSStorageDriver({
      bucket: config.storage.gcs.bucket,
      projectId: config.storage.gcs.projectId,
      keyFilename: config.storage.gcs.keyFilename,
      publicBaseUrl: config.storage.gcs.publicBaseUrl,
    });
  }

  throw new Error(`Unsupported storage driver: ${config.storage.driver}`);
}
