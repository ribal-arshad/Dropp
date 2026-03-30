import type { MediaRepository } from "../../core/index.js";
import type { Media, MediaCreateInput } from "../../types/index.js";

export class PrismaMediaRepository implements MediaRepository {
  constructor(private readonly prisma: any) {}

  async create(data: MediaCreateInput): Promise<Media> {
    return this.prisma.media.create({ data });
  }

  async findById(id: string): Promise<Media | null> {
    return this.prisma.media.findUnique({ where: { id } });
  }

  async findByModel(model: string, modelId: string): Promise<Media[]> {
    return this.prisma.media.findMany({ where: { model, modelId } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.media.delete({ where: { id } });
  }
}
