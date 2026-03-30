import type { MediaRepository } from "../../core/index.js";
import type { Media, MediaCreateInput } from "../../types/index.js";

export class MongooseMediaRepository implements MediaRepository {
  constructor(private readonly model: any) {}

  async create(data: MediaCreateInput): Promise<Media> {
    const created = await this.model.create(data);
    return created.toObject ? created.toObject() : created;
  }

  async findById(id: string): Promise<Media | null> {
    const item = await this.model.findById(id);
    if (!item) return null;
    return item.toObject ? item.toObject() : item;
  }

  async findByModel(model: string, modelId: string): Promise<Media[]> {
    const items = await this.model.find({ model, modelId });
    return items.map((item: any) => (item.toObject ? item.toObject() : item));
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }
}
