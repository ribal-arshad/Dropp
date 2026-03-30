import type { MediaRepository } from "../../core/index.js";
import type { Media, MediaCreateInput } from "../../types/index.js";

export class DrizzleMediaRepository implements MediaRepository {
  constructor(
    private readonly db: any,
    private readonly mediaTable: any,
  ) {}

  async create(data: MediaCreateInput): Promise<Media> {
    const [created] = await this.db
      .insert(this.mediaTable)
      .values(data)
      .returning();
    return created;
  }

  async findById(id: string): Promise<Media | null> {
    const [item] = await this.db.select().from(this.mediaTable).where({ id });
    return item ?? null;
  }

  findByModel(model: string, modelId: string): Promise<Media[]> {
    return this.db.select().from(this.mediaTable).where({ model, modelId });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(this.mediaTable).where({ id });
  }
}
