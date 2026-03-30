// @ts-nocheck
import { PrismaClient } from "@prisma/client";
import { PrismaMediaRepository } from "droppjs";

const prisma = new PrismaClient();

export const mediaRepository = async () => {
  return new PrismaMediaRepository(prisma);
};
