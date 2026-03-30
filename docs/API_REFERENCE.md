# API Reference

This is the practical map of Dropp's user-facing API.

No mystery, no archaeology, no "read 14 files and guess" energy.

## Package

- Install: `pnpm add droppjs`
- Import from: `droppjs`

## Core class

### `Dropp`

Constructor dependencies (`DroppDependencies`):

- `repository` (required): persistence adapter implementing repository contract
- `storage` (required): storage adapter implementing upload/getUrl/delete
- `transformer` (optional): transformation driver
- `queue` (optional): queue driver (used for async transformations)
- `plugins` (optional): array of media plugins

If you only remember two things: `repository` and `storage` are required.

### Methods

- `attach(input: AttachInput): Promise<Media>`
  - Upload + persist metadata
  - De-duplicates by file hash in same model/scope
  - Handles version metadata (`version`, `active`, `previousVersionId`)
- `get(id: string): Promise<Media | null>`
- `getByModel(model: string, modelId: string): Promise<Media[]>`
- `delete(id: string): Promise<void>`
- `rollback(id: string): Promise<Media>`
- `replace(id: string, input: ReplaceInput, options?: { version?: boolean }): Promise<Media>`
  - `version: true` → keep old media as previous version
  - `version: false` (default) → hard replace (old file + old record removed)

## Code usage (not CLI)

Yes, Dropp is a code API too.

```ts
import { Dropp, JsonFileMediaRepository, LocalStorageDriver } from "droppjs";

const dropp = new Dropp({
  repository: new JsonFileMediaRepository(".dropp/media.json"),
  storage: new LocalStorageDriver("media", "/media"),
});

const created = await dropp.attach({
  file: fileBuffer,
  fileName: "cover.jpg",
  mimeType: "image/jpeg",
  model: "posts",
  modelId: "1",
  collection: "cover",
});

// Hard replace (default): deletes old file + old DB row
const replaced = await dropp.replace(created.id, {
  file: updatedFileBuffer,
  fileName: "cover-v2.jpg",
  mimeType: "image/jpeg",
});

// Versioned replace: keeps old record as previous version
const versioned = await dropp.replace(
  replaced.id,
  {
    file: updatedAgainBuffer,
    fileName: "cover-v3.jpg",
    mimeType: "image/jpeg",
  },
  { version: true },
);
```

If you like fluent style (`media.attach(file).to(...)`), you can wrap Dropp in your own tiny helper.
Dropp stays explicit on purpose so data flow stays easy to debug at 3AM.

## Core input/output types

### `AttachInput`

- `file`: unknown (typically `Buffer` / `Uint8Array`)
- `fileName`: string
- `mimeType`: string
- `model`: string
- `modelId`: string
- `tenantId?`: string
- `collection?`: string
- `metadata?`: record
- `transformations?`: `Transformation[]`

### `ReplaceInput`

- `file`: unknown (typically `Buffer` / `Uint8Array`)
- `fileName?`: string (defaults to current file name)
- `mimeType?`: string (defaults to current mime type)
- `metadata?`: record
- `transformations?`: `Transformation[]`

### `Transformation`

- `type`: `resize | crop | webp | thumbnail | transcode`
- `options?`: record

### `Media`

- `id`, `model`, `modelId`, `tenantId?`, `collection`
- `fileName`, `mimeType`, `size`, `disk`, `path`, `url`
- `metadata`
- `createdAt`

## Adapters API

### Express exports

- `droppAttachMiddleware(options)`
- `droppErrorHandler()`
- `DroppController`

### NestJS exports

- `DroppService`
- `NestDroppController`
- `DroppModuleOptions`

### Next.js exports

- `handleUpload(request, options)`
- `handleGetMedia(id, options)`
- `handleDeleteMedia(id, options)`
- `handleGetModelMedia(model, modelId, options)`
- `getMedia(id)`
- `useMediaUpload()`

## Storage exports

- Local: `src/storage/local`
- S3: `src/storage/s3`
- R2: `src/storage/r2`
- Azure Blob: `src/storage/azure`
- GCS: `src/storage/gcs`

All are exported via `droppjs` root index.

## DB adapter exports

- `src/db/prisma`
- `src/db/typeorm`
- `src/db/drizzle`
- `src/db/sequelize`
- `src/db/mikroorm`
- `src/db/mongoose`
- `src/db/kysely`

All are exported via `droppjs` root index.

## Plugin exports

- `PluginRegistry`
- `PluginContext`
- `PluginMetadata`
- `PluginMediaPlugin` (type alias)
- Built-ins: Watermark, AI Tagging, SEO

## Config contract (`DroppConfig`)

Top-level fields:

- `orm`
- `storage`
- `queue`
- `cdn?`
- `presets?`
- `plugins?`

See [ORM_GUIDE.md](ORM_GUIDE.md) and [ADAPTERS.md](ADAPTERS.md) for practical setup.

## Minimal usage example

```ts
import { Dropp } from "droppjs";

const dropp = new Dropp({
  repository,
  storage,
  plugins: [],
});

const media = await dropp.attach({
  file: buffer,
  fileName: "cover.jpg",
  mimeType: "image/jpeg",
  model: "post",
  modelId: "1",
  collection: "cover",
});
```

If this runs on first try, buy yourself coffee.

If it runs on second try, still coffee. You earned it.
