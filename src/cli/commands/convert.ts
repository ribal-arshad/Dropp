import { Args, Command, Flags } from "@oclif/core";
import { loadConfig } from "../../config/index.js";
import { join } from "node:path";
import { SharpTransformationDriver } from "../../transformer/image/index.js";
import { FfmpegTransformationDriver } from "../../transformer/video/index.js";
import { resolveRepository } from "../utils/repository.js";

export default class Convert extends Command {
  static override description =
    "Convert/transform a media item (local storage source path required)";

  static override args = {
    id: Args.string({
      description: "Media id",
      required: true,
    }),
  };

  static override flags = {
    resizeWidth: Flags.integer({ description: "Resize width for images" }),
    resizeHeight: Flags.integer({ description: "Resize height for images" }),
    webp: Flags.boolean({
      description: "Convert image output to webp",
      default: false,
    }),
    json: Flags.boolean({ description: "Print JSON output", default: false }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(Convert);
    const { config } = await loadConfig(process.cwd());

    if (config.storage.driver !== "local") {
      this.error(
        "convert currently requires local storage driver for direct file transformations.",
        { exit: 1 },
      );
    }

    const repository = await resolveRepository(config, process.cwd());
    const media = await repository.findById(args.id);

    if (!media) {
      this.error(`Media not found: ${args.id}`, { exit: 1 });
    }

    const baseDir = config.storage.local?.baseDir ?? "media";
    const sourcePath = join(process.cwd(), baseDir, media.path);

    const isImage = media.mimeType.startsWith("image/");

    const transformations: Array<{
      type: string;
      options?: Record<string, unknown>;
    }> = [];
    if (flags.resizeWidth || flags.resizeHeight) {
      transformations.push({
        type: "resize",
        options: {
          width: flags.resizeWidth,
          height: flags.resizeHeight,
        },
      });
    }

    if (flags.webp && isImage) {
      transformations.push({ type: "webp" });
    }

    if (transformations.length === 0 && isImage) {
      transformations.push({ type: "webp" });
    }

    const driver = isImage
      ? new SharpTransformationDriver()
      : new FfmpegTransformationDriver();

    const result = await driver.transform({
      sourcePath,
      mimeType: media.mimeType,
      transformations,
    });

    if (flags.json) {
      this.log(
        JSON.stringify(
          {
            mediaId: media.id,
            sourcePath,
            outputPath: result.outputPath,
            transformations,
          },
          null,
          2,
        ),
      );
      return;
    }

    this.log(`Converted media: ${media.id}`);
    this.log(`source: ${sourcePath}`);
    this.log(`output: ${result.outputPath}`);
  }
}
