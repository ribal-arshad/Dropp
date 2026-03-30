import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import type { TransformationDriver } from "../../core/index.js";

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath as unknown as string);
}

export class FfmpegTransformationDriver implements TransformationDriver {
  async transform(input: {
    sourcePath: string;
    mimeType: string;
    transformations: Array<{ type: string; options?: Record<string, unknown> }>;
  }): Promise<{ outputPath: string; metadata?: Record<string, unknown> }> {
    const outputPath = `${input.sourcePath}.mp4`;

    await new Promise<void>((resolve, reject) => {
      ffmpeg(input.sourcePath)
        .output(outputPath)
        .on("end", () => resolve())
        .on("error", reject)
        .run();
    });

    return { outputPath };
  }
}
