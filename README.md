# Dropp

Dropp is a media management toolkit for Node.js and TypeScript.

Think of it as your media team in a box: upload files, transform them, store them anywhere, and keep metadata tidy without building a mini startup just to handle image uploads.

Supported upload categories out of the box: images, videos, audio files, and documents.

## What you get

- One all-in-one package: `droppjs`
- Framework-agnostic core + CLI in the same package
- ORM adapters for Prisma, TypeORM, Drizzle, Sequelize, MikroORM, Mongoose, and Kysely
- Storage adapters for Local, S3, Cloudflare R2, Azure Blob, and GCS
- Image/video transformers
- Plugin hooks and ready-made plugins

Short version: one package, fewer headaches, more shipping.

## Single package structure

- `src/core` - orchestration engine and attach/get/delete workflows
- `src/cli` - `dropp` command-line interface
- `src/db/*` - ORM repository adapters
- `src/storage/*` - storage drivers
- `src/transformer/*` - media transformation drivers
- `src/queue/bullmq` - async processing queue adapter
- `src/plugins/*` - plugin ecosystem
- `src/types` - shared contracts and domain types
- `src/config` - config schema and loading utilities

## Fast start

1. Install dependencies:
   - `pnpm install`
2. Build:
   - `pnpm build`
3. Initialize config:
   - `node ./bin/run.js init`
4. Run doctor checks:
   - `node ./bin/run.js doctor --verbose`

If `doctor` is happy, your future self will also be happy.

If `doctor` is unhappy, your future self will still be happy you checked early.

## Documentation index

- **[Cookbook: Complete Feature Guide](docs/COOKBOOK.md)** ← Start here (attach, delete, batch ops, pagination, plugins)
- **[Plugin Development Guide](docs/PLUGIN_DEVELOPMENT_GUIDE.md)** ← Build custom plugins
- Docs hub: [docs/README.md](docs/README.md)
- Quick start: [docs/QUICK_START.md](docs/QUICK_START.md)
- API reference (core/adapters/types): [docs/API_REFERENCE.md](docs/API_REFERENCE.md)
- CLI command reference: [docs/CLI_REFERENCE.md](docs/CLI_REFERENCE.md)
- ORM guide: [docs/ORM_GUIDE.md](docs/ORM_GUIDE.md)
- Framework guide: [docs/FRAMEWORK_GUIDE.md](docs/FRAMEWORK_GUIDE.md)
- Adapter reference: [docs/ADAPTERS.md](docs/ADAPTERS.md)
- Plugin development: [docs/PLUGIN_GUIDE.md](docs/PLUGIN_GUIDE.md)

## TL;DR user flow

1. `dropp config:init`
2. `dropp doctor --verbose`
3. `dropp attach ./sample.jpg --model post --modelId 1 --collection cover`
4. `dropp list --limit 10`

If step 4 shows your file, you win.

Optional celebration: dramatic victory music.

## SDK usage (code, not only CLI)

Dropp is not CLI-only.

- `await dropp.attach({...})`
- `await dropp.replace(id, {...})` for hard replace (default)
- `await dropp.replace(id, {...}, { version: true })` for versioned replace

See [docs/API_REFERENCE.md](docs/API_REFERENCE.md) for full code examples.

## Repository adapter examples

Ready-to-use examples live in:

- Adapters: [examples/adapters/README.md](examples/adapters/README.md)
- `examples/repositories/prisma`
- `examples/repositories/typeorm`
- `examples/repositories/drizzle`
- `examples/repositories/sequelize`
- `examples/repositories/mikroorm`
- `examples/repositories/mongoose`
- `examples/repositories/kysely`

## Built-in plugins

- Watermark - brand overlays and text watermarking
- AI Tagging - automatic tag generation
- SEO - alt text and metadata helpers

See [docs/PLUGIN_GUIDE.md](docs/PLUGIN_GUIDE.md) for plugin authoring and lifecycle hooks.
