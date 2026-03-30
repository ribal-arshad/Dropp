import { isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";
import { JsonFileMediaRepository, type MediaRepository } from "../../core/index.js";
import type { DroppConfig, Media, MediaQuery } from "../../types/index.js";

export type RepositoryWithOptionalAll = MediaRepository & {
  all?: () => Promise<Media[]>;
  findMany?: (query: MediaQuery) => Promise<Media[]>;
};

export async function resolveRepository(
  config: DroppConfig,
  cwd: string,
): Promise<RepositoryWithOptionalAll> {
  if (config.orm.driver === "json") {
    return new JsonFileMediaRepository(join(cwd, ".dropp", "media.json"));
  }

  const moduleConfig = config.orm.repository;
  if (!moduleConfig) {
    throw new Error(
      `ORM driver '${config.orm.driver}' requires orm.repository.module in dropp.config.json.`,
    );
  }

  const modulePath = moduleConfig.module;
  const resolvedPath = isAbsolute(modulePath)
    ? modulePath
    : join(cwd, modulePath);
  const imported = await import(pathToFileURL(resolvedPath).href);
  const exportName = moduleConfig.exportName ?? "default";
  const entry = imported[exportName];

  if (!entry) {
    throw new Error(
      `Repository export '${exportName}' was not found in ${modulePath}.`,
    );
  }

  const repository =
    typeof entry === "function"
      ? await entry({ cwd, config, options: moduleConfig.options ?? {} })
      : entry;

  validateRepository(repository, modulePath, exportName);
  return repository;
}

function validateRepository(
  repository: unknown,
  modulePath: string,
  exportName: string,
): asserts repository is RepositoryWithOptionalAll {
  if (!repository || typeof repository !== "object") {
    throw new Error(
      `Repository export '${exportName}' from ${modulePath} is not an object.`,
    );
  }

  const value = repository as Record<string, unknown>;
  const required = ["create", "findById", "findByModel", "delete"];

  for (const method of required) {
    if (typeof value[method] !== "function") {
      throw new Error(
        `Repository export '${exportName}' from ${modulePath} must implement '${method}()'.`,
      );
    }
  }
}
