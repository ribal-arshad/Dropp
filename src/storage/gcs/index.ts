import { Storage } from "@google-cloud/storage";
import type { StorageDriver } from "../../core/index.js";

export type GCSStorageOptions = {
  bucket: string;
  projectId?: string;
  keyFilename?: string;
  publicBaseUrl?: string;
};

export class GCSStorageDriver implements StorageDriver {
  private readonly storage: Storage;

  constructor(private readonly options: GCSStorageOptions) {
    this.storage = new Storage({
      projectId: options.projectId,
      keyFilename: options.keyFilename,
    });
  }

  async upload(file: unknown, path: string): Promise<string> {
    const bucket = this.storage.bucket(this.options.bucket);
    const target = bucket.file(path);
    const content = file instanceof Uint8Array ? file : new Uint8Array(0);
    await target.save(content);
    return path;
  }

  async delete(path: string): Promise<void> {
    const bucket = this.storage.bucket(this.options.bucket);
    await bucket.file(path).delete({ ignoreNotFound: true });
  }

  getUrl(path: string): string {
    if (this.options.publicBaseUrl)
      return `${this.options.publicBaseUrl}/${path}`;
    return `https://storage.googleapis.com/${this.options.bucket}/${path}`;
  }
}
