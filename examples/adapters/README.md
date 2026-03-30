# Adapter Examples

These examples show framework wiring with the current single-package setup (`droppjs`).

Copy, adapt, ship. No ceremony required.

## Files

- [express/complete-app.ts](express/complete-app.ts)
- [nestjs/complete-app.ts](nestjs/complete-app.ts)
- [next/complete-app.ts](next/complete-app.ts)

## Notes

- They are reference apps/snippets, not production templates.
- `next/complete-app.ts` is intentionally a consolidated reference; split it into route files in real projects.
- For quick local smoke testing, the examples use `JsonFileMediaRepository` + local storage.

Simple on purpose, so you can focus on integration shape first.

## Minimal run idea

- Express: `npx tsx examples/adapters/express/complete-app.ts`
- NestJS: import `bootstrap()` from the file and call it from your Nest app entrypoint.
- Next.js: copy handlers into your `app/api` routes.
