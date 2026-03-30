// @ts-nocheck
import { MikroORM } from "@mikro-orm/core";
import { MikroOrmMediaRepository } from "droppjs";

// Replace this with your MikroORM entity
import { MediaEntity } from "./entities/MediaEntity.js";

let ormPromise: Promise<MikroORM> | undefined;

function getOrm(): Promise<MikroORM> {
  if (!ormPromise) {
    ormPromise = MikroORM.init({
      entities: [MediaEntity],
      dbName: process.env.DB_NAME ?? "app",
      type: "postgresql" as never,
      user: process.env.DB_USER ?? "postgres",
      password: process.env.DB_PASSWORD ?? "postgres",
      host: process.env.DB_HOST ?? "127.0.0.1",
      port: Number(process.env.DB_PORT ?? 5432),
    });
  }

  return ormPromise;
}

export const mediaRepository = async () => {
  const orm = await getOrm();
  const em = orm.em.fork();
  const repo = em.getRepository(MediaEntity);
  return new MikroOrmMediaRepository(repo, em);
};
