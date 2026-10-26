# Prisma migration brief (read this first)

This repo is an independent copy of `yumyumyumi_v2`, being rebuilt by an AI agent on the Prisma platform:

- Drizzle ORM → **Prisma ORM**
- Neon → **Prisma Postgres** (free tier, `ap-northeast-1`)
- Vercel hosting → **Prisma Compute**
- Vercel Blob stays (it works from any host via `BLOB_READ_WRITE_TOKEN`)
- Auth.js v5 stays (its `users` lookup moves to the new ORM)

The migration itself is the subject of a blog article evaluating **how well the Prisma platform works when an agent does the work**. The process and logging rules below exist to produce that evidence and are mandatory in every session.

## Process

1. Read the codebase and the **current** Prisma docs first, then present a plan before changing anything.
2. Work in small, verifiable steps. After each step, run `npx tsc --noEmit` and validate data against the Zod schemas (the `isValidOf` gate; a validation script against real rows counts).
3. Keep a running log in `MIGRATION_LOG.md` with, for each step:
   - what you did and why
   - any error, the exact message, and how you resolved it
   - whether the cause was: the existing code, Prisma tooling/docs/platform, or the agent's own mistake
   - any point where human input was needed
   - anything in the docs or CLI that was unclear, missing, or especially helpful
4. At the end, write a summary in the log: what went smoothly, what was rough, open issues, and how many times human help was needed.

Don't hide or smooth over problems. Rough edges are useful findings for the post.

## Contract guardrails

- **Preserve every query function's external contract exactly**: camelCase keys, ISO-string timestamps, Zod-validated returns, same null/empty fallbacks. Components must not need changes. Serialize Prisma's `Date` values to ISO strings at the query-function boundary.
- Nested jsonb (`ingredients`, `directions`) stays snake_case in the DB (`is_spice`), camelCase in the app. Use `@map` for top-level columns; keep `objectToCamel`/`objectToSnake` only at the jsonb boundary.
- **Ownership checks stay in the query**: mutations filter by `id AND userId` from the session, never id alone.
- The barrel rule from AGENTS.md applies unchanged to the Prisma client: server-only modules never reach a client-importable barrel.
- **Do not write Prisma code from training data.** Prisma ORM, Prisma Postgres, and Prisma Compute APIs may be newer than the model; read the current docs (prisma.io/docs) before using any of them, same as the Next.js rule below.
- `AGENTS.md` below describes the pre-migration stack (Drizzle/Neon/Vercel). Where this brief contradicts it, this brief wins; update AGENTS.md sections as each migration step lands.

## Secrets

Never put secret values (connection strings, API tokens, passwords) in code, `MIGRATION_LOG.md`, commit messages, or chat output. Refer to them by env var name only. Real values live in `.env.local` (gitignored); `.env.example` gets names and placeholders only.

@AGENTS.md
