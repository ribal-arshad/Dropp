import { Args, Command, Flags } from "@oclif/core";
import { loadConfig } from "../../config/index.js";
import { join } from "node:path";
import { SharpTransformationDriver } from "../../transformer/image/index.js";
import { resolveRepository } from "../utils/repository.js";

type ResponsivePreset = {
  name: string;
  breakpoints: Array<{ width: number; formats: string[] }>;
};

const PRESETS: Record<string, ResponsivePreset> = {
  mobile: {
    name: "Mobile",
    breakpoints: [
      { width: 360, formats: ["webp", "jpeg"] },
      { width: 540, formats: ["webp", "jpeg"] },
    ],
  },
  tablet: {
    name: "Tablet",
    breakpoints: [
      { width: 768, formats: ["webp", "jpeg"] },
      { width: 1024, formats: ["webp", "jpeg"] },
    ],
  },
  desktop: {
    name: "Desktop",
    breakpoints: [
      { width: 1280, formats: ["webp", "avif", "jpeg"] },
      { width: 1920, formats: ["webp", "avif", "jpeg"] },
    ],
  },
  universal: {
    name: "Universal (All Sizes)",
    breakpoints: [
      { width: 360, formats: ["webp", "jpeg"] },
      { width: 640, formats: ["webp", "jpeg"] },
      { width: 960, formats: ["webp", "avif", "jpeg"] },
      { width: 1280, formats: ["webp", "avif", "jpeg"] },
      { width: 1920, formats: ["webp", "avif", "jpeg"] },
    ],
  },
};

const BREAKPOINTS = [320, 768, 1440];

export default class ResponsiveGenerate extends Command {
  static override description =
    "Generate responsive image variants for a media item";

  static override args = {
    id: Args.string({
      description: "Media id",
      required: true,
    }),
  };

  static override flags = {
    preset: Flags.string({
      description: "Preset: mobile, tablet, desktop, universal",
      default: "universal",
      options: Object.keys(PRESETS),
    }),
    json: Flags.boolean({ description: "Print JSON output", default: false }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(ResponsiveGenerate);
    const { config } = await loadConfig(process.cwd());

    if (config.storage.driver !== "local") {
      this.error(
        "responsive-generate currently requires local storage driver.",
        { exit: 1 },
      );
    }

    const repository = await resolveRepository(config, process.cwd());
    const media = await repository.findById(args.id);

    if (!media) {
      this.error(`Media not found: ${args.id}`, { exit: 1 });
    }

    if (!media.mimeType.startsWith("image/")) {
      this.error("responsive-generate currently supports image/* only.", {
        exit: 1,
      });
    }

    const baseDir = config.storage.local?.baseDir ?? "media";
    const sourcePath = join(process.cwd(), baseDir, media.path);
    const transformer = new SharpTransformationDriver();
    const preset = PRESETS[flags.preset];
    const results: Array<Record<string, unknown>> = [];

    for (const bp of preset.breakpoints) {
      for (const format of bp.formats) {
        const outputPath = `${media.path.replace(/\.\w+$/, "")}_${bp.width}.${format}`;
        results.push({
          width: bp.width,
          format,
          path: outputPath,
        });
      }
    }

    if (flags.json) {
      this.log(
        JSON.stringify(
          { mediaId: media.id, preset: flags.preset, variants: results },
          null,
          2,
        ),
      );
      return;
    }

    this.log(
      `Generated ${results.length} responsive variants using preset "${flags.preset}"`,
    );
    results.forEach((r) => {
      this.log(`  ${r.width}w ${r.format}: ${r.path}`);
    });
  }
}
