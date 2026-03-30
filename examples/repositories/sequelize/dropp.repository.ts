// @ts-nocheck
import { Sequelize } from "sequelize";
import { SequelizeMediaRepository } from "droppjs";

// Replace this with your Sequelize model
import { MediaModel } from "./models/MediaModel.js";

const sequelize = new Sequelize(
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/app",
  { logging: false },
);

export const mediaRepository = async () => {
  await sequelize.authenticate();
  return new SequelizeMediaRepository(MediaModel);
};
