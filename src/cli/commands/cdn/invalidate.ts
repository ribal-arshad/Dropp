import { Command, Flags } from "@oclif/core";
import { loadConfig } from "../../../config/index.js";

export default class CdnInvalidate extends Command {
  static override description = "Invalidate CDN cache paths";

  static override flags = {
    path: Flags.string({
      description: "Path to purge (repeatable)",
      multiple: true,
      required: true,
    }),
    json: Flags.boolean({
      description: "Print JSON output",
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(CdnInvalidate);
    const { config } = await loadConfig(process.cwd());
    const cfg = config as unknown as {
      cdn?: {
        enabled?: boolean;
        provider?: "cloudflare" | "webhook";
        cloudflare?: { zoneId: string; apiToken: string };
        webhook?: { endpoint: string; authHeader?: string };
      };
    };

    if (!cfg.cdn?.enabled || !cfg.cdn.provider) {
      throw new Error(
        "CDN is not configured. Set config.cdn.enabled and provider.",
      );
    }

    const paths = flags.path;

    if (cfg.cdn.provider === "cloudflare") {
      if (!cfg.cdn.cloudflare) {
        throw new Error("Missing config.cdn.cloudflare credentials.");
      }

      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfg.cdn.cloudflare.zoneId}/purge_cache`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfg.cdn.cloudflare.apiToken}`,
          },
          body: JSON.stringify({ files: paths }),
        },
      );

      const body = (await response.json()) as { success?: boolean };
      if (!response.ok || !body.success) {
        throw new Error(`Cloudflare purge failed: ${JSON.stringify(body)}`);
      }
    } else if (cfg.cdn.provider === "webhook") {
      if (!cfg.cdn.webhook?.endpoint) {
        throw new Error("Missing config.cdn.webhook.endpoint.");
      }

      const response = await fetch(cfg.cdn.webhook.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cfg.cdn.webhook.authHeader
            ? { Authorization: cfg.cdn.webhook.authHeader }
            : {}),
        },
        body: JSON.stringify({ paths }),
      });

      if (!response.ok) {
        throw new Error(`Webhook purge failed: ${response.status}`);
      }
    }

    const result = { ok: true, provider: cfg.cdn.provider, paths };

    if (flags.json) {
      this.log(JSON.stringify(result, null, 2));
      return;
    }

    this.log(`CDN invalidation submitted for ${paths.length} path(s).`);
  }
}
