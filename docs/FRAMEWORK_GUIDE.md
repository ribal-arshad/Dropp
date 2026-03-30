# Framework Integration Guide

Pick the adapter that fits your app. Ship faster, debate less.

No framework wars here. Just working uploads.

All framework helpers are exported from one package: `droppjs`.

## Express

Best for middleware-first APIs.

## NestJS

Best for modules, decorators, and service layers.

## Next.js

Best for App Router handlers and full-stack React apps.

Detailed adapter setup:

- [ADAPTERS.md](ADAPTERS.md)

Working examples:

- [../examples/adapters/express/complete-app.ts](../examples/adapters/express/complete-app.ts)
- [../examples/adapters/nestjs/complete-app.ts](../examples/adapters/nestjs/complete-app.ts)
- [../examples/adapters/next/complete-app.ts](../examples/adapters/next/complete-app.ts)

## Integration checklist

1. Initialize `Dropp` once per app context
2. Ensure upload middleware/interceptor provides file buffers
3. Always pass `model` and `modelId`
4. Run `doctor` before blaming your framework
5. Keep adapter code thin; keep business logic in services

If this checklist is boring, that means it's battle-tested.

## Test coverage status

Adapter integration tests exist for Express, NestJS, and Next.js.

Run:

- `pnpm test`
