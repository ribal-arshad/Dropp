// @ts-nocheck
import { DataSource } from "typeorm";
import { TypeOrmMediaRepository } from "droppjs";

// Replace this with your actual Media entity class
import { MediaEntity } from "./entities/MediaEntity.js";

const dataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? "postgres",
  password: process.env.DB_PASSWORD ?? "postgres",
  database: process.env.DB_NAME ?? "app",
  entities: [MediaEntity],
  synchronize: false,
});

export const mediaRepository = async () => {
  if (!dataSource.isInitialized) {
    await dataSource.initialize();
  }

  const repo = dataSource.getRepository(MediaEntity);
  return new TypeOrmMediaRepository(repo);
};
