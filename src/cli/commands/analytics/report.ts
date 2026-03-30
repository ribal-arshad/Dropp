import { Command, Flags } from "@oclif/core";
import { loadConfig } from "../../../config/index.js";
import { resolveRepository } from "../../utils/repository.js";

export default class AnalyticsReport extends Command {
  static override description = "Generate media analytics summary report";

  static override flags = {
    tenantId: Flags.string({
      description: "Filter by tenant id",
    }),
    json: Flags.boolean({
      description: "Print JSON output",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(AnalyticsReport);
    const { config } = await loadConfig(process.cwd());
    const repository = await resolveRepository(config, process.cwd());

    let items;
    if (repository.findMany) {
      items = await repository.findMany({ tenantId: flags.tenantId });
    } else if (repository.all) {
      items = await repository.all();
      if (flags.tenantId) {
        items = items.filter((item) => item.tenantId === flags.tenantId);
      }
    } else {
      throw new Error(
        "analytics:report requires repository.findMany() or all().",
      );
    }

    const byCollection = new Map<string, number>();
    const byModel = new Map<string, number>();
    const byMimePrefix = new Map<string, number>();
    let totalSize = 0;

    for (const item of items) {
      byCollection.set(
        item.collection,
        (byCollection.get(item.collection) ?? 0) + 1,
      );
      byModel.set(item.model, (byModel.get(item.model) ?? 0) + 1);
      const prefix = item.mimeType.split("/")[0] ?? "unknown";
      byMimePrefix.set(prefix, (byMimePrefix.get(prefix) ?? 0) + 1);
      totalSize += item.size;
    }

    const report = {
      totalItems: items.length,
      totalSize,
      averageSize: items.length > 0 ? Math.round(totalSize / items.length) : 0,
      byCollection: Object.fromEntries(byCollection.entries()),
      byModel: Object.fromEntries(byModel.entries()),
      byMimePrefix: Object.fromEntries(byMimePrefix.entries()),
    };

    if (flags.json) {
      this.log(JSON.stringify(report, null, 2));
      return;
    }

    this.log(`Total items: ${report.totalItems}`);
    this.log(`Total size: ${report.totalSize} bytes`);
    this.log(`Average size: ${report.averageSize} bytes`);
    this.log(`By collection: ${JSON.stringify(report.byCollection)}`);
    this.log(`By model: ${JSON.stringify(report.byModel)}`);
    this.log(`By mime prefix: ${JSON.stringify(report.byMimePrefix)}`);
  }
}
