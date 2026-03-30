import { S3StorageDriver, type S3StorageOptions } from "../s3/index.js";

export type R2StorageOptions = S3StorageOptions & {
  accountId: string;
};

export class R2StorageDriver extends S3StorageDriver {
  constructor(options: R2StorageOptions) {
    super({
      ...options,
      endpoint:
        options.endpoint ??
        `https://${options.accountId}.r2.cloudflarestorage.com`,
      region: options.region || "auto",
      forcePathStyle: options.forcePathStyle ?? true,
    });
  }
}
