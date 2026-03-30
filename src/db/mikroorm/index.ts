import type { MediaRepository } from "../../core/index.js";
import type { Media, MediaCreateInput } from "../../types/index.js";

export class MikroOrmMediaRepository implements MediaRepository {
  constructor(
    private readonly repository: any,
    private readonly em: any,
  ) {}

  async create(data: MediaCreateInput): Promise<Media> {
    const entity = this.repository.create(data);
    await this.em.persistAndFlush(entity);
    return entity;
  }

  findById(id: string): Promise<Media | null> {
    return this.repository.findOne({ id });
  }

  findByModel(model: string, modelId: string): Promise<Media[]> {
    return this.repository.find({ model, modelId });
  }

  async delete(id: string): Promise<void> {
    const entity = await this.repository.findOne({ id });
    if (!entity) return;
    await this.em.removeAndFlush(entity);
  }
}
