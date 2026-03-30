import type { Request, Response, NextFunction } from "express";
import type { Dropp } from "../../core/index.js";
import type { AttachInput, Media } from "../../types/index.js";

/**
 * Express middleware for file upload handling with Dropp
 */
export interface DroppExpressOptions {
  dropp: Dropp;
  fieldName?: string;
  model: string;
  modelId: string;
  tenantId?: string;
  collection?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Middleware to attach files using Dropp
 *
 * Usage:
 * ```typescript
 * import express from "express";
 * import multer from "multer";
 * import { droppAttachMiddleware } from "./index.js";
 *
 * const app = express();
 * const upload = multer({ storage: multer.memoryStorage() });
 *
 * app.post("/media", upload.single("file"), droppAttachMiddleware({
 *   dropp,
 *   model: "article",
 *   modelId: req.body.modelId
 * }), (req, res) => {
 *   res.json((req as any).media);
 * });
 * ```
 */
export function droppAttachMiddleware(options: DroppExpressOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = (req as any).file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const input: AttachInput = {
        file: file.buffer,
        fileName: file.originalname,
        mimeType: file.mimetype,
        model: options.model,
        modelId: options.modelId,
        collection: options.collection,
        metadata: options.metadata,
      };

      if (options.tenantId) {
        (input as AttachInput & { tenantId?: string }).tenantId =
          options.tenantId;
      }

      const media = await options.dropp.attach(input);

      // Store media on request for downstream handlers
      (req as any).media = media;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Error handling middleware for Dropp
 */
export function droppErrorHandler() {
  return (error: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Dropp Error]", error.message);

    res.status(500).json({
      error: "Media processing failed",
      message: error.message,
    });
  };
}

/**
 * Controller helper for Dropp operations
 */
export class DroppController {
  constructor(private dropp: Dropp) {}

  private asParam(value: string | string[] | undefined): string {
    if (Array.isArray(value)) return value[0] ?? "";
    return value ?? "";
  }

  /**
   * Get single media item
   */
  async getMedia(req: Request, res: Response): Promise<void> {
    try {
      const media = await this.dropp.get(this.asParam(req.params.id));

      if (!media) {
        res.status(404).json({ error: "Media not found" });
        return;
      }

      res.json(media);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  /**
   * Get all media for a model
   */
  async getModelMedia(req: Request, res: Response): Promise<void> {
    try {
      const model = this.asParam(req.params.model);
      const modelId = this.asParam(req.params.modelId);
      const media = await this.dropp.getByModel(model, modelId);
      res.json(media);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }

  /**
   * Delete media
   */
  async deleteMedia(req: Request, res: Response): Promise<void> {
    try {
      await this.dropp.delete(this.asParam(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
}

export default droppAttachMiddleware;
