import type { MediaPlugin, PluginContext } from "../core/index.js";
import sharp from "sharp";

/**
 * Watermark plugin configuration
 */
export interface WatermarkConfig {
  enabled?: boolean;
  text?: string;
  position?: "center" | "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
  opacity?: number;
  fontSize?: number;
  color?: string;
  outputFormat?: "jpeg" | "png" | "webp";
}

/**
 * Watermark plugin for adding text watermarks to images
 * Supports text watermarks with configurable position, opacity, and styling
 */
export class WatermarkPlugin implements MediaPlugin {
  name = "watermark";
  version = "1.0.0";
  description = "Add text watermarks to image files";

  private config: WatermarkConfig = {
    enabled: true,
    text: "© Dropp",
    position: "bottomRight",
    opacity: 0.7,
    fontSize: 24,
    color: "white",
    outputFormat: "png",
  };

  constructor(config: WatermarkConfig = {}) {
    this.config = { ...this.config, ...config };
  }

  async validate(config: Record<string, any>): Promise<void> {
    if (
      config.opacity !== undefined &&
      (config.opacity < 0 || config.opacity > 1)
    ) {
      throw new Error("Watermark opacity must be between 0 and 1");
    }

    if (config.fontSize !== undefined && config.fontSize < 1) {
      throw new Error("Watermark fontSize must be greater than 0");
    }

    if (
      config.position &&
      !["center", "topLeft", "topRight", "bottomLeft", "bottomRight"].includes(
        config.position,
      )
    ) {
      throw new Error(
        "Watermark position must be one of: center, topLeft, topRight, bottomLeft, bottomRight",
      );
    }

    if (
      config.outputFormat &&
      !["jpeg", "png", "webp"].includes(config.outputFormat)
    ) {
      throw new Error(
        "Watermark outputFormat must be one of: jpeg, png, webp",
      );
    }

    if (config.color && !this.isValidColor(config.color)) {
      throw new Error("Watermark color must be a valid hex color or color name");
    }
  }

  async afterUpload(context: PluginContext): Promise<void> {
    if (!this.config.enabled || !this.config.text) return;

    const { file, fileName, mimeType } = context;

    if (!mimeType?.startsWith("image/") || !file) {
      return;
    }

    try {
      const watermarkedBuffer = await this.addWatermark(file, fileName || "image");
      context.file = watermarkedBuffer;
      
      if (!context.metadata) {
        context.metadata = {};
      }

      context.metadata.watermarked = true;
      context.metadata.watermarkText = this.config.text;
      context.metadata.watermarkPosition = this.config.position;
      context.metadata.watermarkOpacity = this.config.opacity;
      context.metadata.watermarkAppliedAt = new Date().toISOString();

    } catch (error) {
      throw new Error(
        `Failed to apply watermark: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async addWatermark(
    imageBuffer: Buffer,
    fileName: string,
  ): Promise<Buffer> {
    const metadata = await sharp(imageBuffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Unable to determine image dimensions");
    }

    const { width, height } = metadata;
    const fontSize = this.config.fontSize || 24;
    const padding = 20;

    const opacityValue = ((this.config.opacity ?? 0.7) * 100).toFixed(0);
    const opacityNum = parseFloat(opacityValue);
    const textSvg = `
      <svg width="${width}" height="${height}">
        <text
          x="50%"
          y="50%"
          text-anchor="middle"
          dominant-baseline="middle"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          font-weight="bold"
          fill="${this.config.color || 'white'}"
          opacity="${opacityNum / 100}"
          text-decoration="none"
        >
          ${this.escapeXml(this.config.text || "© Dropp")}
        </text>
      </svg>
    `;

    const positionMap = {
      center: { x: width / 2, y: height / 2 },
      topLeft: { x: padding + fontSize / 2, y: padding + fontSize / 2 },
      topRight: { x: width - padding - fontSize / 2, y: padding + fontSize / 2 },
      bottomLeft: {
        x: padding + fontSize / 2,
        y: height - padding - fontSize / 2,
      },
      bottomRight: {
        x: width - padding - fontSize / 2,
        y: height - padding - fontSize / 2,
      },
    };

    const pos = positionMap[this.config.position || "bottomRight"];

    const watermarkSvg = `
      <svg width="${width}" height="${height}">
        <text
          x="${pos.x}"
          y="${pos.y}"
          text-anchor="middle"
          dominant-baseline="middle"
          font-family="Arial, sans-serif"
          font-size="${fontSize}"
          font-weight="bold"
          fill="${this.config.color || 'white'}"
          opacity="${opacityNum / 100}"
        >
          ${this.escapeXml(this.config.text || "© Dropp")}
        </text>
      </svg>
    `;

    const watermarkedImage = sharp(imageBuffer)
      .composite([
        {
          input: Buffer.from(watermarkSvg),
          blend: "over",
        },
      ]);

    if (this.config.outputFormat === "jpeg") {
      return watermarkedImage.jpeg({ quality: 90 }).toBuffer();
    } else if (this.config.outputFormat === "webp") {
      return watermarkedImage.webp({ quality: 90 }).toBuffer();
    } else {
      return watermarkedImage.png().toBuffer();
    }
  }

  private isValidColor(color: string): boolean {
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    const colorNames = [
      "white",
      "black",
      "red",
      "green",
      "blue",
      "yellow",
      "cyan",
      "magenta",
      "gray",
      "grey",
    ];
    return hexRegex.test(color) || colorNames.includes(color.toLowerCase());
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }
}

export default WatermarkPlugin;
