# Migration Log: yumyumyumi on the Prisma platform

An AI agent (Claude Code) rebuilds this recipe site on Prisma ORM + Prisma Postgres + Prisma Compute, keeping Vercel Blob. This log is the raw material for a blog article evaluating how well the platform works with an agent. Rules for entries live in `CLAUDE.md`.

Problem causes are classified as one of: `existing-code` | `prisma-platform` (tooling, docs, or service) | `agent-mistake`.

Human interventions are tagged `[HUMAN]` and counted in the final summary.

---

## Entry 0 — Kickoff: context, brief, inventory, plan (2026-10-26)

### Context

Prisma reached out after the blog post about migrating this site off Supabase to Neon + Auth.js + Vercel Blob, and asked for a follow-up where an AI agent rebuilds the site on the Prisma platform, with an honest outside view of how it goes. No payment involved; done for the author's portfolio. The article will be an evaluation of agent-platform fit, not a tutorial.

### Standing brief (verbatim, from the human)

> 1. First, read the codebase and the Prisma docs, then give me a plan before changing anything.
> 2. Work in small, verifiable steps. After each step, run type checks and validate data against the Zod schemas.
> 3. Keep a running log in MIGRATION_LOG.md with, for each step:
>    - what you did and why
>    - any error, the exact message, and how you resolved it
>    - whether the cause was: my code, Prisma tooling/docs/platform, or your own mistake
>    - any point where you needed my input
>    - anything in the docs or CLI that was unclear, missing, or especially helpful
> 4. At the end, write a summary in the log: what went smoothly, what was rough, open issues, and how many times you needed my help.
>
> Don't hide or smooth over problems. Rough edges are useful findings for the post.

### Codebase inventory (pre-migration state)

- Next.js 16 (App Router, Turbopack), React 19, TS strict, Node >= 24.
- DB: `@neondatabase/serverless` + `drizzle-orm/neon-http`; client instantiated in `src/lib/db/index.ts`; query-builder only, no raw SQL outside migrations.
- Schema (`src/lib/db/schema.ts`): `users`, `recipes`, `bookmarks`. Notable gaps to address in the Prisma schema: **no foreign keys, no indexes, no unique on `bookmarks(user_id, recipe_id)`** (uniqueness enforced in app code; `toggleBookmark` is a non-atomic select-then-write).
- Contracts: rows validated with Zod (`isValidOf`), camelCase in app vs snake_case in DB (`ts-case-convert`), timestamps as ISO strings (Drizzle `mode: 'string'`), jsonb `ingredients`/`directions` stored with snake_case keys.
- Data access: 8 query functions under `src/lib/db/queries/` (recipe CRUD + tags, bookmarks get/toggle) plus the Auth.js Credentials `authorize` lookup in `src/auth.ts`. Mutations are Server Actions that re-check `await auth()` and scope writes by `userId`.
- Auth: Auth.js v5, JWT sessions, no DB adapter, single locked account.
- Storage: Vercel Blob behind `src/app/api/upload-image/route.ts` (auth-gated POST/DELETE), independent of the DB layer.
- Env: `DATABASE_URL`, `AUTH_SECRET`, `BLOB_READ_WRITE_TOKEN`, seed-time `SEED_EMAIL`/`SEED_PASSWORD`.
- Tests: 7 Vitest files, all mocking at the query boundary. **No tests over `src/lib/db/queries/` itself** — contracts must be pinned with characterization tests before the port.
- Seed source: `data-export/recipes_export.json` (rescued Supabase data).

### Platform facts checked (2026-10-26, prisma.io)

- Prisma Postgres free tier: 200k operations/month, idle databases cost nothing and auto-wake, no inactivity deletion. Pooled + direct connection strings, `sslmode=require`. Hosted MCP server for managing databases from agent tooling.
- Prisma Compute free tier: 1M requests/month, scales to zero. Bun runtime; supports Next.js. Deploy via `npx prisma deploy` or GitHub deploy-on-push with per-branch preview environments (own DB per branch). Constraints: no framework auto-detection (explicit build declaration), 60s first-byte timeout, no WebSockets, no persistent filesystem, no built-in cron, single region (Tokyo `ap-northeast-1` available).
- Leaving Vercel hosting means `@vercel/analytics` / `@vercel/speed-insights` go away and `BLOB_READ_WRITE_TOKEN` must be created and set manually. Vercel Blob itself works from any host.

### Plan

- **Phase 0 (this entry):** independent copy of the repo, remotes set (`origin` = yumyumyumi-prisma, `upstream` = yumyumyumi_v2), migration brief in `CLAUDE.md`, this log. Then: Prisma workspace + Postgres DB (Tokyo, free tier), GitHub connected for deploy-on-push.
- **Phase 1:** `schema.prisma` modeling the three tables with camelCase fields `@map`ped to snake_case columns; add the missing FKs (`onDelete: Cascade` on bookmarks), `@@unique([userId, recipeId])`, index on `recipes(createdAt)`. Initial migration; port `seed.ts`; write the Zod data-validation gate script early.
- **Phase 2:** pin query contracts with characterization tests, then port the 8 query functions + `auth.ts` lookup to Prisma Client. Remove Drizzle/Neon deps and `db:*` scripts in favor of Prisma equivalents.
- **Phase 3:** deploy to Prisma Compute: explicit build declaration, env vars set manually, remove Vercel-only packages, verify server actions, image upload, `next/image` against the Blob host. Exercise a preview branch.
- **Phase 4:** full verification: lint, tests, build, manual pass on the deployed URL, diff against the Vercel production site.
- **Phase 5:** the article (in the blog repo), led by this log's findings: cause-attribution table, intervention count, what the platform got right/wrong for agent-driven work.

### Human input needed so far

- [HUMAN] Clone command was run by the human (agent sandbox cannot write outside its working directories). Cause: agent environment, not Prisma.
- [HUMAN] Created the `yumyumyumi-prisma` GitHub repo.
- [HUMAN] Pending: interactive Prisma login/workspace creation (done in a separate window to keep session credentials out of this transcript).

---

## Entry 1 — Prisma GitHub setup job fails at `npm install` (2026-10-26)

### What happened

[HUMAN] Connecting the GitHub repo in the Prisma Console failed during the platform's setup job, reported in the Console as:

```
Setup job failed at step 'install': install_failed : npm error
/home/user/.npm/_logs/2026-10-26T06_25_47_515Z-eresolve-report.txt
```

The agent cannot see the Prisma Console, so the human relayed the error.

### Diagnosis

Reproduced locally by resolving dependencies from scratch against the public registry (no lockfile):

```
npm error ERESOLVE unable to resolve dependency tree
npm error Could not resolve dependency:
npm error peerOptional vitest@"^4.0.0 || ^5.0.0" from @storybook/addon-vitest@10.6.3
```

`package.json` had `@storybook/addon-vitest: ^10.4.4`; a fresh resolution picks 10.6.3, which dropped vitest 3 peer support, while the project pins `vitest ^3.2.4`. Local installs never hit this because the committed `package-lock.json` holds addon-vitest 10.4.4 + vitest 3.2.6, and plain `npm install` honors it.

### Cause classification

Split cause:

- `existing-code` — the latent peer conflict (a caret range on a Storybook addon whose newer minors require vitest 4) was in the repo before the migration.
- `prisma-platform` — the setup job re-resolved dependencies instead of honoring a valid, in-sync, committed lockfile (`npm install` and `npm ci` both succeed against this repo as-is). Debuggability note: the Console error points at an `eresolve-report.txt` on the build machine with no way to read it from the Console; the actual conflict had to be reproduced locally.

### Resolution

Constrained `@storybook/addon-vitest` to `~10.4.4` so even a from-scratch resolution succeeds. Verified: fresh `--package-lock-only` resolve passes, `npx tsc --noEmit` clean, 103/103 unit tests pass. Installed versions unchanged (lockfile diff is the two spec strings only).

### Docs/CLI notes

- Prisma docs state migrations must use the direct (non-pooled) connection string; the Console initially surfaced only the pooled URL. Per docs, both strings share credentials and differ only in hostname (`pooled.db.prisma.io` vs `db.prisma.io`).
