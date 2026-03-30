# Dropp Repository Adapters (Examples)

These examples show how to wire `orm.repository.module` for different ORMs.

All examples use single-package imports from `droppjs`.

Pick one, plug it in, and keep moving.

## Config pattern

```json
{
  "orm": {
    "driver": "custom",
    "repository": {
      "module": "./dropp.repository.js",
      "exportName": "mediaRepository"
    }
  }
}
```

> Build/transpile your repository file to `.js` when running in Node ESM.

## Available examples

- Prisma: `examples/repositories/prisma/dropp.repository.ts`
- TypeORM: `examples/repositories/typeorm/dropp.repository.ts`
- Drizzle: `examples/repositories/drizzle/dropp.repository.ts`
- Sequelize: `examples/repositories/sequelize/dropp.repository.ts`
- MikroORM: `examples/repositories/mikroorm/dropp.repository.ts`
- Mongoose: `examples/repositories/mongoose/dropp.repository.ts`
- Kysely: `examples/repositories/kysely/dropp.repository.ts`

Each file exports `mediaRepository`, compatible with `resolveRepository()`.

Tip: you can also scaffold one with CLI:

- `dropp generate:repository prisma`
- `dropp generate:repository typeorm`
