// @ts-nocheck
import mongoose from "mongoose";
import { MongooseMediaRepository } from "droppjs";

// Replace this with your Mongoose model
import { MediaModel } from "./models/MediaModel.js";

let connected = false;

async function ensureConnection(): Promise<void> {
  if (connected) return;

  await mongoose.connect(
    process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/app",
  );

  connected = true;
}

export const mediaRepository = async () => {
  await ensureConnection();
  return new MongooseMediaRepository(MediaModel);
};
