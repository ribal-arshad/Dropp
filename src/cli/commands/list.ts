import { Command, Flags } from "@oclif/core";
import { loadConfig } from "../../config/index.js";
import type { MediaQuery } from "../../types/index.js";
import { resolveRepository } from "../utils/repository.js";

export default class List extends Command {
  static override description =
    "List attached media items from local metadata store";

  static override flags = {
    model: Flags.string({
      description: "Filter by model name",
    }),
    modelId: Flags.string({
      description: "Filter by model id (requires --model for scoped filtering)",
    }),
    tenantId: Flags.string({
      description: "Filter by tenant id",
    }),
    collection: Flags.string({
      description: "Filter by collection name",
    }),
    mimeType: Flags.string({
      description: "Filter by mime type prefix (example: image/)",
    }),
    fileName: Flags.string({
      description: "Filter by filename contains (case-insensitive)",
    }),
    createdAfter: Flags.string({
      description: "Filter by createdAt >= ISO date",
    }),
    createdBefore: Flags.string({
      description: "Filter by createdAt <= ISO date",
    }),
    sort: Flags.string({
      description: "Sort order by createdAt",
      options: ["createdAt:asc", "createdAt:desc"],
      default: "createdAt:desc",
    }),
    limit: Flags.integer({
      description: "Limit number of returned items",
      min: 1,
    }),
    json: Flags.boolean({
      description: "Print JSON output",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(List);
    const { config } = await loadConfig(process.cwd());
    const repository = await resolveRepository(config, process.cwd());

    const createdAfter = flags.createdAfter
      ? this.parseDateFlag("createdAfter", flags.createdAfter)
      : undefined;
    const createdBefore = flags.createdBefore
      ? this.parseDateFlag("createdBefore", flags.createdBefore)
      : undefined;

    const query: MediaQuery = {
      model: flags.model,
      modelId: flags.modelId,
      tenantId: flags.tenantId,
      collection: flags.collection,
      mimeTypePrefix: flags.mimeType,
      fileNameContains: flags.fileName,
      createdAfter,
      createdBefore,
      sort: flags.sort as "createdAt:asc" | "createdAt:desc",
      limit: flags.limit,
    };

    let items;

    if (repository.findMany) {
      items = await repository.findMany(query);
    } else if (flags.model && flags.modelId) {
      items = await repository.findByModel(flags.model, flags.modelId);
    } else if (repository.all) {
      items = await repository.all();
    } else {
      throw new Error(
        "Listing all media requires a repository with all(). Provide --model and --modelId, or expose all() in your custom repository.",
      );
    }

    // Fallback filtering for repositories without findMany()
    if (!repository.findMany) {
      if (flags.model && !flags.modelId)
        items = items.filter((item) => item.model === flags.model);

      if (flags.tenantId)
        items = items.filter((item) => item.tenantId === flags.tenantId);

      if (flags.collection)
        items = items.filter((item) => item.collection === flags.collection);

      if (flags.mimeType) {
        const mimePrefix = flags.mimeType;
        items = items.filter((item) => item.mimeType.startsWith(mimePrefix));
      }

      if (flags.fileName) {
        const needle = flags.fileName.toLowerCase();
        items = items.filter((item) =>
          item.fileName.toLowerCase().includes(needle),
        );
      }

      if (createdAfter)
        items = items.filter(
          (item) =>
            new Date(item.createdAt).getTime() >= createdAfter.getTime(),
        );

      if (createdBefore)
        items = items.filter(
          (item) =>
            new Date(item.createdAt).getTime() <= createdBefore.getTime(),
        );

      const sortDesc = flags.sort === "createdAt:desc";
      items = [...items].sort((a, b) => {
        const aTs = new Date(a.createdAt).getTime();
        const bTs = new Date(b.createdAt).getTime();
        return sortDesc ? bTs - aTs : aTs - bTs;
      });

      if (flags.limit) items = items.slice(0, flags.limit);
    }

    if (flags.json) {
      this.log(JSON.stringify(items, null, 2));
      return;
    }

    if (items.length === 0) {
      this.log("No media items found.");
      return;
    }

    this.log(`Found ${items.length} media item(s):`);
    for (const item of items) {
      this.log(
        `- ${item.id} | ${item.tenantId ?? "default"}/${item.model}:${item.modelId} | ${item.fileName} | ${item.url}`,
      );
    }
  }

  private parseDateFlag(flagName: string, value: string): Date {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(
        `Invalid --${flagName} value '${value}'. Use an ISO date (example: 2026-03-26T00:00:00Z).`,
      );
    }

    return parsed;
  }
}
