# ORM Guide

Dropp expects a repository module so it can persist and query media records.

In short: your ORM does database things, Dropp does media things, and they shake hands through one exported object.

Everybody has one job. Everybody is happier.

## Repository contract

Your module should export `mediaRepository` and implement the expected repository methods used by Dropp.

### Config shape

Use this pattern:

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

If you author in TypeScript, make sure the runtime file is compiled to `.js`.

## Supported ORMs

- Prisma
- TypeORM
- Drizzle
- Sequelize
- MikroORM
- Mongoose
- Kysely

## Official examples

Check these working examples:

- [../examples/repositories/prisma/dropp.repository.ts](../examples/repositories/prisma/dropp.repository.ts)
- [../examples/repositories/typeorm/dropp.repository.ts](../examples/repositories/typeorm/dropp.repository.ts)
- [../examples/repositories/drizzle/dropp.repository.ts](../examples/repositories/drizzle/dropp.repository.ts)
- [../examples/repositories/sequelize/dropp.repository.ts](../examples/repositories/sequelize/dropp.repository.ts)
- [../examples/repositories/mikroorm/dropp.repository.ts](../examples/repositories/mikroorm/dropp.repository.ts)
- [../examples/repositories/mongoose/dropp.repository.ts](../examples/repositories/mongoose/dropp.repository.ts)
- [../examples/repositories/kysely/dropp.repository.ts](../examples/repositories/kysely/dropp.repository.ts)

## Migration workflow

Use the CLI migration command:

- `dropp migrate --orm prisma --mode dev`
- `dropp migrate --orm drizzle --mode deploy`
- `dropp migrate --orm typeorm --mode status`
- `dropp migrate --orm sequelize --dry-run`

## Common mistakes

1. Wrong module path in config
2. Export name mismatch (`mediaRepository` vs something else)
3. TypeScript file not built to JavaScript before runtime
4. Missing DB credentials in environment

## Recommended validation sequence

1. `dropp config:validate`
2. `dropp doctor --verbose`
3. `dropp list --limit 1`

If that works, your ORM handshake is healthy.

Handshake complete. No awkward eye contact required.
