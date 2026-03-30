# Framework Adapters

Dropp includes framework adapters in the same `droppjs` package.

Translation: one package, less drama.

Pick your framework, wire once, move on with your life.

## Quick chooser

- Express → middleware-first routes
- NestJS → modules/services/decorators
- Next.js → App Router handlers

## Install

- `pnpm add droppjs`

Then add only what your framework needs:

- Express: `pnpm add express multer`
- NestJS: `pnpm add @nestjs/common @nestjs/core @nestjs/platform-express`
- Next.js: `pnpm add next`

## Express API

Exports from `droppjs`:

- `droppAttachMiddleware(options)`
- `droppErrorHandler()`
- `DroppController`

`droppAttachMiddleware(options)` options:

- `dropp`: initialized `Dropp` instance
- `model`: string
- `modelId`: string
- `tenantId?`: string
- `collection?`: string
- `metadata?`: object

## NestJS API

Exports from `droppjs`:

- `DroppService`
- `NestDroppController` (renamed export of the adapter controller)
- `DroppModuleOptions` type

Typical flow:

1. Create one `Dropp` instance
2. Inject `DroppService`
3. Use `FileInterceptor("file")`
4. Pass `model` + `modelId`

## Next.js API

Exports from `droppjs`:

- `handleUpload(request, options)`
- `handleGetMedia(id, options)`
- `handleDeleteMedia(id, options)`
- `handleGetModelMedia(model, modelId, options)`
- `getMedia(id)`
- `useMediaUpload()`

`handleUpload()` options:

- `dropp`: initialized `Dropp` instance
- `model`: string
- `modelId`: string
- `tenantId?`: string
- `collection?`: string

## Rules that prevent pain

- Always pass both `model` and `modelId`
- Keep adapter code thin; keep business logic in your service layer
- Run `dropp doctor --verbose` before deep debugging
- Use `--json` when wiring CLI commands into CI scripts

These rules are boring. Boring is good. Boring means production is calm.

## Testing

- `pnpm test`

## Related docs

- Quick start: [QUICK_START.md](QUICK_START.md)
- API reference: [API_REFERENCE.md](API_REFERENCE.md)
- CLI reference: [CLI_REFERENCE.md](CLI_REFERENCE.md)
- ORM setup: [ORM_GUIDE.md](ORM_GUIDE.md)
- Plugin guide: [PLUGIN_GUIDE.md](PLUGIN_GUIDE.md)
