import sharp from "sharp";
import type { TransformationDriver } from "../../core/index.js";

export class SharpTransformationDriver implements TransformationDriver {
  async transform(input: {
    sourcePath: string;
    mimeType: string;
    transformations: Array<{ type: string; options?: Record<string, unknown> }>;
  }): Promise<{ outputPath: string; metadata?: Record<string, unknown> }> {
    let pipeline = sharp(input.sourcePath);

    for (const transformation of input.transformations) {
      if (transformation.type === "resize") {
        const width = Number(transformation.options?.width ?? 0) || undefined;
        const height = Number(transformation.options?.height ?? 0) || undefined;
        pipeline = pipeline.resize(width, height);
      }

      if (transformation.type === "webp") {
        pipeline = pipeline.webp();
      }
    }

    const outputPath = `${input.sourcePath}.out`;
    await pipeline.toFile(outputPath);

    return { outputPath };
  }
}
