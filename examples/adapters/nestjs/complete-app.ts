// @ts-nocheck
/**
 * NestJS + Dropp example (single-package setup)
 */

import {
  Module,
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import path from "node:path";
import {
  Dropp,
  DroppService,
  JsonFileMediaRepository,
  LocalStorageDriver,
  SharpTransformationDriver,
} from "droppjs";

const dropp = new Dropp({
  repository: new JsonFileMediaRepository(
    path.join(process.cwd(), ".dropp", "media.json"),
  ),
  storage: new LocalStorageDriver(
    path.join(process.cwd(), "uploads"),
    "/uploads",
  ),
  transformer: new SharpTransformationDriver(),
});

@Controller("media")
class MediaController {
  constructor(private readonly droppService: DroppService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile()
    file:
      | {
          buffer: Buffer;
          originalname: string;
          mimetype: string;
        }
      | undefined,
    @Query("model") model?: string,
    @Query("modelId") modelId?: string,
    @Query("collection") collection?: string,
  ) {
    if (!file) throw new BadRequestException("No file uploaded");
    if (!model || !modelId) {
      throw new BadRequestException("model and modelId query params required");
    }

    const media = await this.droppService.attach({
      file: file.buffer,
      fileName: file.originalname,
      mimeType: file.mimetype,
      model,
      modelId,
      collection,
    });

    return { success: true, media };
  }

  @Get(":id")
  async getMedia(@Param("id") id: string) {
    const media = await this.droppService.get(id);
    if (!media) throw new NotFoundException("Media not found");
    return media;
  }

  @Get("model/:model/:modelId")
  getModelMedia(
    @Param("model") model: string,
    @Param("modelId") modelId: string,
  ) {
    return this.droppService.getByModel(model, modelId);
  }

  @Delete(":id")
  async deleteMedia(@Param("id") id: string) {
    await this.droppService.delete(id);
    return { success: true };
  }
}

@Module({
  controllers: [MediaController],
  providers: [
    {
      provide: DroppService,
      useFactory: () => new DroppService(dropp),
    },
  ],
})
class AppModule {}

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
  console.log("NestJS example running on http://localhost:3000");
}
