import { BlobServiceClient } from "@azure/storage-blob";
import type { StorageDriver } from "../../core/index.js";

export type AzureStorageOptions = {
  connectionString: string;
  container: string;
  publicBaseUrl?: string;
};

export class AzureBlobStorageDriver implements StorageDriver {
  private readonly containerClient;

  constructor(private readonly options: AzureStorageOptions) {
    const service = BlobServiceClient.fromConnectionString(
      options.connectionString,
    );
    this.containerClient = service.getContainerClient(options.container);
  }

  async upload(file: unknown, path: string): Promise<string> {
    const client = this.containerClient.getBlockBlobClient(path);
    const body = file instanceof Uint8Array ? file : new Uint8Array(0);
    await client.uploadData(body);
    return path;
  }

  async delete(path: string): Promise<void> {
    await this.containerClient.deleteBlob(path);
  }

  getUrl(path: string): string {
    if (this.options.publicBaseUrl)
      return `${this.options.publicBaseUrl}/${path}`;
    return `${this.containerClient.url}/${path}`;
  }
}
