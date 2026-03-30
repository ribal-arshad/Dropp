import type { MediaRepository } from "../../core/index.js";
import type { Media, MediaCreateInput } from "../../types/index.js";

export class KyselyMediaRepository implements MediaRepository {
  constructor(
    private readonly db: any,
    private readonly tableName = "media",
  ) {}

  async create(data: MediaCreateInput): Promise<Media> {
    const created = await this.db
      .insertInto(this.tableName)
      .values(data)
      .returningAll()
      .executeTakeFirstOrThrow();

    return created;
  }

  async findById(id: string): Promise<Media | null> {
    const row = await this.db
      .selectFrom(this.tableName)
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return row ?? null;
  }

  async findByModel(model: string, modelId: string): Promise<Media[]> {
    return this.db
      .selectFrom(this.tableName)
      .selectAll()
      .where("model", "=", model)
      .where("modelId", "=", modelId)
      .execute();
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom(this.tableName).where("id", "=", id).execute();
  }
}
