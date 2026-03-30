# Quick Start

This guide gets you from zero to first upload in a few minutes.

Goal: less setup, more "it works".

Alias tip: if `dropp` is not globally available yet, run `node ./bin/run.js` instead.

## 1) Install and build

- `pnpm install`
- `pnpm build`

## 2) Initialize config

- `node ./bin/run.js config:init`

## 3) Check environment

- `node ./bin/run.js doctor --verbose`

## 4) Upload your first file

- `node ./bin/run.js attach ./sample.jpg --model post --modelId 1 --collection cover`
- `node ./bin/run.js attach ./sample.mp3 --model podcast --modelId 1 --collection episodes`
- `node ./bin/run.js attach ./guide.pdf --model docs --modelId 42 --collection manuals`

## 5) View uploaded media

- `node ./bin/run.js list --limit 10`

## 6) Inspect one media item

- `node ./bin/run.js info <media-id>`

## 7) Optional: optimize/convert

- `node ./bin/run.js optimize <media-id>`
- `node ./bin/run.js convert <media-id> --resizeWidth 1200 --webp`

## 8) JSON output for scripts

- `node ./bin/run.js list --limit 10 --json`
- `node ./bin/run.js info <media-id> --json`

If you automate anything, use `--json` and future-you will send thank-you notes.

## Next docs

- API reference: [API_REFERENCE.md](API_REFERENCE.md)
- CLI reference: [CLI_REFERENCE.md](CLI_REFERENCE.md)
- ORM setup: [ORM_GUIDE.md](ORM_GUIDE.md)
- Framework integration: [FRAMEWORK_GUIDE.md](FRAMEWORK_GUIDE.md)
- Plugins: [PLUGIN_GUIDE.md](PLUGIN_GUIDE.md)
- Adapters: [ADAPTERS.md](ADAPTERS.md)
