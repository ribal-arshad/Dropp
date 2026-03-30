import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { StorageDriver } from "../../core/index.js";

export class LocalStorageDriver implements StorageDriver {
  constructor(
    private readonly baseDir = "media",
    private readonly baseUrl = "/media",
  ) {}

  async upload(file: unknown, path: string): Promise<string> {
    const fullPath = join(this.baseDir, path);
    await mkdir(dirname(fullPath), { recursive: true });

    const content = file instanceof Uint8Array ? file : new Uint8Array(0);
    await writeFile(fullPath, content);

    return path;
  }

  async delete(path: string): Promise<void> {
    await rm(join(this.baseDir, path), { force: true });
  }

  getUrl(path: string): string {
    return `${this.baseUrl}/${path}`;
  }
}
