import {
  PutObjectCommand,
  S3Client,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { StorageDriver } from "../../core/index.js";

export type S3StorageOptions = {
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  publicBaseUrl?: string;
};

export class S3StorageDriver implements StorageDriver {
  private readonly client: S3Client;

  constructor(private readonly options: S3StorageOptions) {
    this.client = new S3Client({
      region: options.region,
      endpoint: options.endpoint,
      forcePathStyle: options.forcePathStyle,
    });
  }

  async upload(file: unknown, path: string): Promise<string> {
    const body = file instanceof Uint8Array ? file : new Uint8Array(0);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.options.bucket,
        Key: path,
        Body: body,
      }),
    );
    return path;
  }

  async delete(path: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.options.bucket,
        Key: path,
      }),
    );
  }

  getUrl(path: string): string {
    if (this.options.publicBaseUrl)
      return `${this.options.publicBaseUrl}/${path}`;
    return `https://${this.options.bucket}.s3.${this.options.region}.amazonaws.com/${path}`;
  }
}
