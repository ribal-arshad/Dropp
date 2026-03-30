import type { MediaPlugin, PluginContext } from "../core/index.js";
import OpenAI from "openai";

/**
 * AI Tagging plugin configuration
 */
export interface AITaggingConfig {
  enabled?: boolean;
  provider?: "openai";
  apiKey?: string;
  maxTags?: number;
  confidenceThreshold?: number;
  model?: string;
}

/**
 * Tag result from AI analysis
 */
export interface AITag {
  label: string;
  confidence: number;
}

/**
 * AI Tagging plugin for automatic image/video labeling
 * Uses OpenAI's Vision API to automatically extract tags and labels from media
 */
export class AITaggingPlugin implements MediaPlugin {
  name = "ai-tagging";
  version = "1.0.0";
  description = "Automatically tag media using OpenAI Vision API";

  private config: AITaggingConfig = {
    enabled: true,
    provider: "openai",
    maxTags: 10,
    confidenceThreshold: 0.7,
    model: "gpt-4-vision-preview",
  };

  private client?: OpenAI;

  constructor(config: AITaggingConfig = {}) {
    this.config = { ...this.config, ...config };

    if (this.config.apiKey || process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: this.config.apiKey || process.env.OPENAI_API_KEY,
      });
    }
  }

  async validate(config: Record<string, any>): Promise<void> {
    if (config.provider && config.provider !== "openai") {
      throw new Error("AI tagging provider must be: openai");
    }

    if (config.maxTags !== undefined && config.maxTags < 1) {
      throw new Error("AI tagging maxTags must be greater than 0");
    }

    if (
      config.confidenceThreshold !== undefined &&
      (config.confidenceThreshold < 0 || config.confidenceThreshold > 1)
    ) {
      throw new Error("AI tagging confidenceThreshold must be between 0 and 1");
    }

    if (!config.apiKey && !process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key required (set OPENAI_API_KEY env var)");
    }
  }

  async afterUpload(context: PluginContext): Promise<void> {
    if (!this.config.enabled || !this.client) return;

    const { file, fileName, mimeType } = context;

    // Only process images and videos
    if (!file) {
      return;
    }

    if (!mimeType?.startsWith("image/") && !mimeType?.startsWith("video/")) {
      return;
    }

    try {
      const tags = await this.extractTags(file, fileName || "media");

      if (!context.metadata) {
        context.metadata = {};
      }

      context.metadata.aiTags = tags.map((t) => t.label);
      context.metadata.aiTagsWithConfidence = tags;
      context.metadata.aiProvider = "openai";
      context.metadata.aiTaggedAt = new Date().toISOString();
      context.metadata.aiModel = this.config.model;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`AI tagging failed: ${error.message}`);
      }
      throw new Error("AI tagging failed");
    }
  }

  private async extractTags(
    imageBuffer: Buffer,
    fileName: string,
  ): Promise<AITag[]> {
    if (!this.client) {
      throw new Error("OpenAI client not initialized");
    }

    const base64Image = imageBuffer.toString("base64");

    try {
      const response = await this.client.chat.completions.create({
        model: this.config.model || "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
              },
              {
                type: "text",
                text: `Analyze this image and provide a JSON array of tags/labels describing the content. 
                
Format your response as a valid JSON array like this:
[
  {"label": "tag1", "confidence": 0.95},
  {"label": "tag2", "confidence": 0.87},
  ...
]

Provide up to ${this.config.maxTags || 10} tags. Each tag should have a label and confidence score between 0 and 1.
Only include tags where confidence is at least ${this.config.confidenceThreshold || 0.7}.
Respond ONLY with the JSON array, no other text.`,
              },
            ],
          },
        ],
        max_tokens: 500,
      });

      const content = response.choices[0].message.content;

      if (!content) {
        return [];
      }

      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error("Failed to parse AI response as JSON array");
      }

      const tags = JSON.parse(jsonMatch[0]) as AITag[];

      return tags
        .filter(
          (tag) => tag.confidence >= (this.config.confidenceThreshold || 0.7),
        )
        .slice(0, this.config.maxTags || 10)
        .sort((a, b) => b.confidence - a.confidence);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("Failed to parse AI tagging response");
      }
      throw error;
    }
  }
}

export default AITaggingPlugin;
