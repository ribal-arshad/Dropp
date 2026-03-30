# CLI Reference

Dropp CLI is available as `dropp` (or `node ./bin/run.js` locally).

Same power, different outfit.

If you want code usage (`dropp.attach`, `dropp.replace`) see [API_REFERENCE.md](API_REFERENCE.md).

## Common flags

- `--json` for machine-readable output
- `--help` for command-level help

## Core command flags (quick lookup)

Think of this as your "don't-make-me-open-help-10-times" section.

### `attach`

- Required: `--model`, `--modelId`
- Optional: `--tenantId`, `--collection`, `--metadata`, `--json`

### `list`

- Optional filters: `--model`, `--modelId`, `--tenantId`, `--collection`, `--mimeType`, `--fileName`
- Optional date filters: `--createdAfter`, `--createdBefore`
- Optional paging/sort: `--sort`, `--limit`, `--json`

### `convert`

- Optional: `--resizeWidth`, `--resizeHeight`, `--webp`, `--json`

### `migrate`

- Required intent: `--orm`, `--mode`
- Optional: `--name`, `--dryRun`

### `doctor`

- Optional: `--verbose`, `--strict`, `--json`

## Setup and health

- `dropp init`
- `dropp config:init`
- `dropp config:show`
- `dropp config:validate`
- `dropp doctor --verbose`

## Core media operations

- `dropp attach <file> --model <name> --modelId <id> [--collection <name>]`
- `dropp get <mediaId>`
- `dropp info <mediaId>`
- `dropp list [--limit <n>]`
- `dropp remove <mediaId>`
- `dropp rollback <mediaId>`

## Transform and optimization

- `dropp optimize <mediaId>`
- `dropp convert <mediaId> [--resizeWidth <n>] [--webp]`
- `dropp responsive-generate <mediaId>`

## Upload and processing extras

- `dropp upload:resumable <file> --model <name> --modelId <id>`
- `dropp batch`
- `dropp batch:process`
- `dropp watch`
- `dropp server:start`

## Collections

- `dropp collections`
- `dropp collections:create <name>`
- `dropp collections:list`
- `dropp collections:add-media <collection> <mediaId>`
- `dropp collections:remove-media <collection> <mediaId>`

## Plugins

- `dropp plugin`
- `dropp plugin:install <name>`
- `dropp plugin:list`
- `dropp plugin:remove <name>`

## Generate scaffolding

- `dropp generate`
- `dropp generate:all`
- `dropp generate:model <name>`
- `dropp generate:repository --orm <driver>`
- `dropp generate:migration --orm <driver> [--mode <mode>]`

## ORM migrations

- `dropp migrate --orm prisma --mode dev`
- `dropp migrate --orm drizzle --mode deploy`
- `dropp migrate --orm typeorm --mode status`

## Storage, CDN, analytics

- `dropp storage-sync`
- `dropp cdn:invalidate`
- `dropp analytics:report`

## Recommended user flow

1. `dropp config:init`
2. `dropp doctor --verbose`
3. `dropp attach ./sample.jpg --model post --modelId 1 --collection cover`
4. `dropp list --limit 10`

If step 4 shows your media, everything is wired correctly.

If not, run `dropp doctor --verbose` and let the CLI be your therapist.
