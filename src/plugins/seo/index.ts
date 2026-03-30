import type { MediaPlugin, PluginContext } from "../core/index.js";

/**
 * SEO plugin configuration
 */
export interface SEOConfig {
  enabled?: boolean;
  generateAltText?: boolean;
  generateDescription?: boolean;
  addImageSitemap?: boolean;
  compressMetadata?: boolean;
}

/**
 * SEO plugin for enriching media with SEO metadata
 */
export class SEOPlugin implements MediaPlugin {
  name = "seo";
  version = "0.1.0";
  description = "Add SEO-friendly metadata to media files";

  private config: SEOConfig = {
    enabled: true,
    generateAltText: true,
    generateDescription: true,
    addImageSitemap: true,
    compressMetadata: false,
  };

  constructor(config: SEOConfig = {}) {
    this.config = { ...this.config, ...config };
  }

  async validate(config: Record<string, any>): Promise<void> {
    const validKeys = [
      "enabled",
      "generateAltText",
      "generateDescription",
      "addImageSitemap",
      "compressMetadata",
    ];

    for (const key of validKeys) {
      if (config[key] !== undefined && typeof config[key] !== "boolean") {
        throw new Error(`SEO config ${key} must be boolean`);
      }
    }
  }

  async afterUpload(context: PluginContext): Promise<void> {
    if (!this.config.enabled) return;

    const { fileName, mimeType, collection } = context;

    if (!fileName || !mimeType?.startsWith("image/")) {
      return;
    }

    if (!context.metadata) {
      context.metadata = {};
    }

    const seoMetadata: Record<string, any> = {};

    if (this.config.generateAltText) {
      seoMetadata.altText = this.generateAltText(fileName, collection);
    }

    if (this.config.generateDescription) {
      seoMetadata.description = this.generateDescription(fileName);
    }

    if (this.config.addImageSitemap) {
      seoMetadata.imageSitemap = true;
      seoMetadata.lastModified = new Date().toISOString();
    }

    context.metadata.seo = seoMetadata;
    context.metadata.seoProcessedAt = new Date().toISOString();

    console.log(
      `[SEO] Generated SEO metadata for ${fileName} in collection: ${collection}`,
    );
  }

  private generateAltText(fileName: string, collection?: string): string {
    const name = fileName.replace(/\.[^/.]+$/, "");

    const formatted = name
      .replace(/[-_]/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    return collection ? `${collection} - ${formatted}` : formatted;
  }

  private generateDescription(fileName: string): string {
    const name = fileName.replace(/\.[^/.]+$/, "");
    return `Image: ${name}. Uploaded to Dropp media library for optimal image management and delivery.`;
  }
}

export default SEOPlugin;
