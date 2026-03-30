import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";

export type Collection = {
  id: string;
  name: string;
  description?: string;
  customProperties?: Record<string, unknown>;
  mediaIds: string[];
  createdAt: string;
  updatedAt: string;
};

type CollectionsFile = {
  collections: Collection[];
};

const defaultState: CollectionsFile = { collections: [] };

export function getCollectionsFilePath(cwd: string): string {
  return join(cwd, ".dropp", "collections.json");
}

export async function readCollections(cwd: string): Promise<Collection[]> {
  const filePath = getCollectionsFilePath(cwd);
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as CollectionsFile;
    return parsed.collections ?? [];
  } catch {
    return [];
  }
}

export async function writeCollections(
  cwd: string,
  collections: Collection[],
): Promise<void> {
  const filePath = getCollectionsFilePath(cwd);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify({ collections }, null, 2), "utf8");
}

export function createCollection(input: {
  name: string;
  description?: string;
  customProperties?: Record<string, unknown>;
}): Collection {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    name: input.name,
    description: input.description,
    customProperties: input.customProperties,
    mediaIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function touchCollection(collection: Collection): Collection {
  return {
    ...collection,
    updatedAt: new Date().toISOString(),
  };
}

export function findCollectionById(
  collections: Collection[],
  id: string,
): Collection | undefined {
  return collections.find((collection) => collection.id === id);
}

export function findCollectionByName(
  collections: Collection[],
  name: string,
): Collection | undefined {
  const normalized = name.trim().toLowerCase();
  return collections.find(
    (collection) => collection.name.trim().toLowerCase() === normalized,
  );
}
