import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  Injectable,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Dropp } from "../../core/index.js";
import type { AttachInput, Media } from "../../types/index.js";

/**
 * NestJS Dropp Service - Injectable service for media operations
 */
@Injectable()
export class DroppService {
  constructor(private dropp: Dropp) {}

  async attach(input: AttachInput): Promise<Media> {
    return this.dropp.attach(input);
  }

  async get(id: string): Promise<Media | null> {
    return this.dropp.get(id);
  }

  async getByModel(model: string, modelId: string): Promise<Media[]> {
    return this.dropp.getByModel(model, modelId);
  }

  async delete(id: string): Promise<void> {
    return this.dropp.delete(id);
  }
}

/**
 * NestJS Dropp Module - Provides DroppService
 */
export interface DroppModuleOptions {
  dropp: Dropp;
}

/**
 * Example NestJS Controller using Dropp
 *
 * Usage:
 * ```typescript
 * import { DroppService } from "./index.js";
 *
 * @Controller("media")
 * export class MediaController {
 *   constructor(private droppService: DroppService) {}
 *
 *   @Post()
 *   @UseInterceptors(FileInterceptor("file"))
 *   async upload(
 *     @UploadedFile() file: Express.Multer.File,
 *     @Body() body: any
 *   ) {
 *     return this.droppService.attach({
 *       file: file.buffer,
 *       fileName: file.originalname,
 *       mimeType: file.mimetype,
 *       model: body.model,
 *       modelId: body.modelId
 *     });
 *   }
 * }
 * ```
 */
@Controller("media")
export class DroppController {
  constructor(private droppService: DroppService) {}

  /**
   * Upload media file
   * POST /media
   */
  @Post()
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          originalname: string;
          mimetype: string;
        }
      | undefined,
    @Body()
    body: {
      model: string;
      modelId: string;
      tenantId?: string;
      collection?: string;
    },
  ): Promise<Media> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    const input: AttachInput = {
      file: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      model: body.model,
      modelId: body.modelId,
      collection: body.collection,
    };

    if (body.tenantId) {
      (input as AttachInput & { tenantId?: string }).tenantId = body.tenantId;
    }

    return this.droppService.attach(input);
  }

  /**
   * Get single media item
   * GET /media/:id
   */
  @Get(":id")
  async getMedia(@Param("id") id: string): Promise<Media> {
    const media = await this.droppService.get(id);

    if (!media) {
      throw new NotFoundException("Media not found");
    }

    return media;
  }

  /**
   * Get all media for a model
   * GET /media/model/:model/:modelId
   */
  @Get("model/:model/:modelId")
  async getModelMedia(
    @Param("model") model: string,
    @Param("modelId") modelId: string,
  ): Promise<Media[]> {
    return this.droppService.getByModel(model, modelId);
  }

  /**
   * Delete media
   * DELETE /media/:id
   */
  @Delete(":id")
  async deleteMedia(@Param("id") id: string): Promise<void> {
    return this.droppService.delete(id);
  }
}

export default DroppService;
