/**
 * Express + Dropp example (single-package setup)
 *
 * Run with tsx:
 *   pnpm add -D tsx
 *   npx tsx examples/adapters/express/complete-app.ts
 */

import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import multer from "multer";
import path from "node:path";
import {
  Dropp,
  JsonFileMediaRepository,
  LocalStorageDriver,
  SharpTransformationDriver,
  DroppController,
  droppAttachMiddleware,
  droppErrorHandler,
} from "droppjs";

const app = express();
app.use(express.json());

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

const dropp = new Dropp({
  repository: new JsonFileMediaRepository(
    path.join(process.cwd(), ".dropp", "media.json"),
  ),
  storage: new LocalStorageDriver(
    path.join(process.cwd(), "uploads"),
    "/uploads",
  ),
  transformer: new SharpTransformationDriver(),
});

const asParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
};

const requireModelParams = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.params.model || !req.params.modelId) {
    return res
      .status(400)
      .json({ error: "model and modelId route params are required" });
  }

  next();
};

/**
 * POST /media/:model/:modelId
 * Upload a file.
 */
app.post(
  "/media/:model/:modelId",
  upload.single("file"),
  requireModelParams,
  (req, res, next) => {
    return droppAttachMiddleware({
      dropp,
      model: asParam(req.params.model),
      modelId: asParam(req.params.modelId),
      collection:
        typeof req.query.collection === "string"
          ? req.query.collection
          : undefined,
    })(req, res, next);
  },
  (req: Request, res: Response) => {
    res
      .status(201)
      .json({
        success: true,
        media: (req as Request & { media?: unknown }).media,
      });
  },
);

const controller = new DroppController(dropp);
app.get("/media/:id", controller.getMedia.bind(controller));
app.get(
  "/media/model/:model/:modelId",
  controller.getModelMedia.bind(controller),
);
app.delete("/media/:id", controller.deleteMedia.bind(controller));

app.use(droppErrorHandler());

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Express example running on http://localhost:${port}`);
  console.log("POST /media/post/1 (multipart form-data, file field: file)");
});
