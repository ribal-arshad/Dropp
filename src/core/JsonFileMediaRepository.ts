import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { Media, MediaCreateInput, MediaQuery } from "../types/index.js";
import type { MediaRepository } from "./contracts.js";

type MediaRecord = Omit<Media, "createdAt"> & { createdAt: string };

export class JsonFileMediaRepository implements MediaRepository {
  constructor(private readonly filePath: string) {}

  all(): Promise<Media[]> {
    return this.readAll();
  }

  async create(data: MediaCreateInput): Promise<Media> {
    const all = await this.readAll();

    const created: Media = {
      id: randomUUID(),
      createdAt: data.createdAt ?? new Date(),
      ...data,
    };

    all.push(created);
    await this.writeAll(all);
    return created;
  }

  async findById(id: string): Promise<Media | null> {
    const all = await this.readAll();
    return all.find((item) => item.id === id) ?? null;
  }

  async findByModel(model: string, modelId: string): Promise<Media[]> {
    const all = await this.readAll();
    return all.filter(
      (item) => item.model === model && item.modelId === modelId,
    );
  }

  async update(id: string, patch: Partial<Media>): Promise<Media | null> {
    const all = await this.readAll();
    const index = all.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const next: Media = {
      ...all[index],
      ...patch,
      id: all[index].id,
      createdAt: all[index].createdAt,
    };

    all[index] = next;
    await this.writeAll(all);
    return next;
  }

  async delete(id: string): Promise<void> {
    const all = await this.readAll();
    const next = all.filter((item) => item.id !== id);
    await this.writeAll(next);
  }

  async findMany(query: MediaQuery): Promise<Media[]> {
    let items = await this.readAll();

    if (query.model) items = items.filter((item) => item.model === query.model);
    if (query.modelId)
      items = items.filter((item) => item.modelId === query.modelId);
    if (query.tenantId)
      items = items.filter((item) => item.tenantId === query.tenantId);
    if (query.collection)
      items = items.filter((item) => item.collection === query.collection);

    if (query.mimeTypePrefix)
      items = items.filter((item) =>
        item.mimeType.startsWith(query.mimeTypePrefix as string),
      );

    if (query.fileNameContains) {
      const needle = query.fileNameContains.toLowerCase();
      items = items.filter((item) =>
        item.fileName.toLowerCase().includes(needle),
      );
    }

    if (query.createdAfter) {
      const after = query.createdAfter.getTime();
      items = items.filter((item) => item.createdAt.getTime() >= after);
    }

    if (query.createdBefore) {
      const before = query.createdBefore.getTime();
      items = items.filter((item) => item.createdAt.getTime() <= before);
    }

    const sort = query.sort ?? "createdAt:desc";
    items = [...items].sort((a, b) => {
      const aTs = a.createdAt.getTime();
      const bTs = b.createdAt.getTime();
      return sort === "createdAt:desc" ? bTs - aTs : aTs - bTs;
    });

    if (query.limit && query.limit > 0) {
      items = items.slice(0, query.limit);
    }

    return items;
  }

  private async readAll(): Promise<Media[]> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as MediaRecord[];
      return parsed.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
      }));
    } catch {
      return [];
    }
  }

  private async writeAll(items: Media[]): Promise<void> {
    const records: MediaRecord[] = items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    }));

    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(records, null, 2), "utf8");
  }
}
