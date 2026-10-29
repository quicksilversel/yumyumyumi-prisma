# Migration Log: yumyumyumi on the Prisma platform

An AI agent (Claude Code) rebuilds this recipe site on Prisma ORM + Prisma Postgres + Prisma Compute, keeping Vercel Blob. This log is the raw material for a blog article evaluating how well the platform works with an agent. Rules for entries live in `CLAUDE.md`.

Problem causes are classified as one of: `existing-code` | `prisma-platform` (tooling, docs, or service) | `agent-mistake`.

Human interventions are tagged `[HUMAN]` and counted in the final summary.

---

## Entry 0 — Kickoff: context, brief, inventory, plan (2026-10-26)

### Context

Prisma reached out after the blog post about migrating this site off Supabase to Neon + Auth.js + Vercel Blob, and asked for a follow-up where an AI agent rebuilds the site on the Prisma platform, with an honest outside view of how it goes. The article will be an evaluation of agent-platform fit, not a tutorial.

### Standing brief (verbatim, from the human)

> I'm migrating my hobby recipe app (Next.js) from Drizzle + Neon on Vercel to Prisma ORM + Prisma Postgres + Prisma Compute. I'm writing a blog post evaluating how well this stack works when an AI agent does the migration, so how you work matters as much as the result.
>
> ## Context
> - Current stack: Next.js, Drizzle ORM, Neon Postgres, Auth.js (Credentials, single user, JWT), Vercel Blob for images, Zod validation.
> - Data: 19 recipes, 4 bookmarks, 1 user. ingredients/directions are jsonb.
> - Keep Vercel Blob for storage. Do not migrate storage.
> - Prisma docs: https://www.prisma.io/docs. Install and use the official Prisma agent skills (github.com/prisma/skills) if available.
>
> ## Constraints (these must hold, but figure out how yourself)
> - All existing Zod schemas and component contracts stay unchanged. Only the internals of the data-access layer change.
> - The app must behave identically: listing, detail, create/edit/delete, bookmarks, login, image upload.
> - Data must be migrated with no loss. Verify row counts and spot-check content afterward.
> - Do NOT touch the current production deployment or Neon database. Work on a new branch and deploy to a separate Compute URL.
> - No secrets in code or logs.
>
> ## Process
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

---

## Entry 2 — Setup job fails again with the same opaque error (2026-10-26)

### What happened

[HUMAN] After the entry 1 fix merged to `main` (06:44 UTC), the human retried connecting the repo. The setup job failed again at 06:51 UTC with a byte-for-byte identical error shape: `install_failed` plus a path to an `eresolve-report.txt` on the build machine.

### Diagnosis (incomplete, by necessity)

This failure could not be reproduced locally. A from-scratch, no-lockfile resolution of the fixed `package.json` against the public registry passes cleanly on the local toolchain (npm 11.17.0, Node 24). Conclusion: Prisma's build image resolves a different dependency tree than local npm. The leading suspect is a different Node version on the builder, since npm's resolver skips package versions whose `engines` don't match the running Node, which changes the whole peer graph. This is unverifiable from outside: the Console shows neither the install log, nor the report file, nor the builder's Node/npm versions. Second occurrence of the same debuggability wall; the only available strategy was to remove the entire class of error rather than fix the specific conflict.

### Human intervention on the approach

- [HUMAN] The agent's first proposal was a committed `.npmrc` with `legacy-peer-deps=true` (suppress peer checking entirely, since the builder's view of the tree is unknowable). The human rejected it: no resolver overrides; upgrade the packages properly instead.

### Resolution: upgrade the vitest/storybook family to latest

- `vitest`, `@vitest/browser`, `@vitest/coverage-v8`: 3.2.x → **5.0.5**
- `storybook`, `@storybook/addon-vitest`, `@storybook/addon-a11y`, `@storybook/addon-docs`, `@storybook/nextjs-vite`, `eslint-plugin-storybook`: ^10.4.4 → **^10.6.3** (addon-vitest accepts vitest 4/5, closing the original conflict with every spec at latest)

Upgrade friction (none of it Prisma's):

- vitest 5 removed string browser providers. `provider: 'playwright'` in `vitest.config.ts` fails typecheck (`TS2769: Type 'string' is not assignable to type 'BrowserProviderOption'`). Fix: new dev dependency `@vitest/browser-playwright` and `provider: playwright()`.
- The provider upgrade pins a new Playwright browser revision, so browser tests fail with `browserType.launch: Executable doesn't exist` until `npx playwright install chromium` re-downloads (~92 MB).
- Storybook 10.6 prints a notice that `setProjectAnnotations` in `.storybook/vitest.setup.ts` is applied automatically since 10.3; left as-is for now, candidate cleanup.
- `npm audit` reports 21 vulnerabilities (3 critical) across the dev tree after the upgrade; untriaged, pre-existing concern, not caused by this change.

### Verification

`npx tsc --noEmit` clean; unit tests 103/103; storybook browser tests 175/175 with the new provider; lint 0 errors (2 pre-existing stylelint browser-compat warnings in `Textarea.tsx`); from-scratch no-lockfile resolution passes.

### Cause classification

- `existing-code` — stale caret pins (vitest 3 era) created the conflict surface.
- `prisma-platform` — repeated: the install step neither honors the committed lockfile nor exposes any way to see what it actually resolved or why it failed. For an agent, an error that cannot be read is an error that cannot be fixed directly; it forces shotgun remediation.

### Open

- Whether the builder's Node/npm versions differ from local remains unconfirmed (no visibility). If the next retry still fails, the remaining options are asking Prisma support or bisecting dependencies blind.

---

## Entry 3 — Third identical failure; moving reproduction to CI (2026-10-26)

### What happened

[HUMAN] The entry 2 upgrade merged at 07:33 UTC; the setup job failed again at 07:36 UTC with the same error shape for the third time: `install_failed` plus an unreadable `eresolve-report.txt` path. Three fixes based on local reproduction have now shipped (version pin, then full family upgrade) and none can be confirmed against what the builder actually does.

### Local diagnostics, exhausted

Against the upgraded `package.json` (vitest 5 / storybook 10.6), every local attempt to force the error passes cleanly on npm 11.17.0 / Node 24:

- from-scratch resolve, no lockfile: passes
- `--strict-peer-deps`: passes
- `--omit=optional`: passes

Remaining untestable variable locally: the builder's Node version (only Node 24/26 installed here; Compute docs say the platform supports Node 22.18+/24.11+/26+, so the build image may run Node 22, and npm's resolver selects different package versions under a different Node, which changes the peer graph).

### Resolution attempt: make the failure readable

Added `.github/workflows/pr-check.yml` with two jobs:

1. `check` — lint, typecheck, unit + storybook browser tests on every PR (the build step activates once a `DATABASE_URL` repo secret exists, since `next build` pre-renders pages that query the database). This was planned anyway; pulled forward.
2. `diagnose-fresh-install` (temporary) — lockfile-less `npm install --package-lock-only` on clean ubuntu for Node 22 and 24. If either reproduces the ERESOLVE, the full report finally becomes readable in the Actions log.

### Cause classification

- `prisma-platform` — third occurrence. The combination of (a) lockfile-blind dependency resolution, (b) no access to install logs, and (c) no visibility into the build image's Node/npm versions means the error is being fixed by hypothesis. An agent-oriented platform claim implies machine-readable failures; this one cannot be read by human or agent.

### Open

- If CI reproduces on Node 22: pin/adjust whatever the report names, or set the builder's expected Node explicitly if the platform honors `engines`/a config.
- If CI passes on both Node versions: the builder diverges from stock npm on clean Linux, and the realistic next step is contacting Prisma (the collaboration contact offered help; the opaque setup job is legitimate product feedback regardless).

### CI diagnostic results

All green on the first run: `check` (lint, typecheck, 103 unit + 175 browser tests) passed, and `diagnose-fresh-install` resolved the tree from scratch without error on clean ubuntu under **both Node 22 and Node 24** (same npm 11.x line as the builder's error output). Stock npm cannot be made to fail on this package.json anywhere we control.

**Revised leading hypothesis:** the Console's "retry" may re-run the setup job against a checkout cached from the first connection attempt, so none of the three fixes were ever actually tested by the builder. The timeline fits: every failure is byte-identical to the first, and the original pre-fix tree is the one tree that reproducibly fails a fresh resolve everywhere. Next action [HUMAN]: disconnect the GitHub repo in the Prisma Console and connect it again from scratch instead of retrying, forcing a fresh clone. If even a fresh connection fails, contact Prisma with the findings above.

---

## Entry 4 — The "waiting for deployment" state, decoded (2026-10-26)

### What happened

[HUMAN] After rechecking the Console, the GitHub integration no longer errors. It now shows: "Waiting for GitHub to start the first deployment. Push to the default branch to retry if it does not start." The human merged the CI PR (a push to main); nothing started, and unlike Vercel there is no deployments tab at all.

### Diagnosis

Reading the Compute/Composer docs end to end resolves it: **Prisma's deploy-on-push runs from the repo's own GitHub Actions**, not from a Prisma-side builder watching pushes. A connected repo authenticates via GitHub OIDC, but the deployment only happens when a committed workflow runs `prisma/cloud-deploy-action` (default branch → production, other branches → per-branch stages). The repo must also contain a Composer declaration: `module.ts` provisioning a service, `src/service.ts` using the `nextjs` build adapter, `prisma.config.ts` with the composer extensions, and `output: 'standalone'` in `next.config.ts`. None of that exists in this repo yet (it is Phase 3 work), so there is nothing for any push to start.

### Cause classification

- `prisma-platform` (docs/UX) — the Console message says "push to the default branch to retry", which implies the platform is watching pushes and will act on one. What is actually missing is repo-side setup (a workflow + Composer files) that the Console never mentions and nothing scaffolds. Also unlike Vercel, connecting a repo creates no visible deployments surface until the first action-driven deploy, which reads as "nothing is happening" with no pointer to why. The information needed to decode the state lives in the Composer docs, not in the product.
- Not a defect: once decoded, the model (CI-driven deploys, OIDC, per-branch stages named after branches) is coherent and arguably more transparent than a black-box builder. It just is not discoverable from the Console.

### State

No action needed until Phase 3, which now has a concrete checklist: `@prisma/composer` + `@prisma/composer-prisma-cloud` + `prisma` CLI, `module.ts`, `src/service.ts` (nextjs adapter), `prisma.config.ts` (composer extensions, region `ap-northeast-1`), `output: 'standalone'`, `force-dynamic` on pages/actions touching runtime services, and a workflow invoking `prisma/cloud-deploy-action`. The original install-failure root cause remains officially unconfirmed (the stale-retry hypothesis fits all evidence but cannot be proven from outside).

---

## Entry 5 — Phase 1: contract, baseline migration, seed, validation gate (2026-10-27)

### Version decision

`npm view prisma` shows `latest` = **8.0.0-rc.27**, a release candidate, while `@prisma/client`'s latest is stable 7.10.1. Prisma's official agent skill (`prisma-orm-setup` from github.com/prisma/skills) defaults **new applications to Prisma ORM 8**. [HUMAN] Decision: follow the skill's default and use the 8 RC; the article then evaluates the path Prisma itself steers agents onto. Note the skew trap for agents: "install latest prisma + latest @prisma/client" currently yields CLI 8 RC against client 7, two incompatible worlds.

### Prisma 8 is a different product, and the skills carry it

Prisma 8 is contract-first: `src/prisma/contract.prisma` → `prisma contract emit` → `contract.json`/`contract.d.ts` → a `db.orm.<ns>.<Model>` + `db.sql` runtime, with migrations planned from contract diffs over an explicit migration graph with refs. Nothing from classic Prisma training data applies (`schema.prisma`, `@prisma/client`, `prisma migrate dev` are all gone). The decisive factor: `prisma orm init` scaffolds the project and `prisma skills sync` installs a package-owned, version-matched agent skill (routing table + ~2,500 lines of references) into `.agents/`/`.claude/`/`.cursor/`. The agent wrote the full three-model contract (camelCase fields `@map`ped to snake_case, `Uuid` PKs with `sql`-literal DB defaults, `String[]?` nullable array, `Json` columns with jsonb defaults, FKs with `Cascade`/`SetNull`, `@@unique([userId, recipeId])`, a named index) and it **emitted clean on the first attempt** — entirely off the skill references, zero docs-site round-trips. The skill even pre-empted a real trap: Postgres timestamp types return `Temporal` values that throw `RUNTIME.TEMPORAL_UNAVAILABLE` on Node 22/24 without a polyfill; the documented `TimestamptzString` alternative both avoids that and happens to preserve this app's string-timestamp Zod contract exactly.

### What happened, in order

1. `npx prisma orm init --yes --target postgres --authoring psl` — clean scaffold (contract, `prisma.config.ts`, `db.ts`, quick-ref). It silently edits `tsconfig.json` (`module: preserve`) and `package.json`; acceptable but worth knowing. Installed `@prisma/orm-postgres` was rc.20 against CLI rc.27; `prisma skills sync` reconciled the skill to the installed package version.
2. Adapted `prisma.config.ts`: load `.env.local` (repo convention; the CLI's env-inject output even printed the multi-file tip unprompted) and use `DIRECT_URL` for CLI commands since migrations fail through the pooler.
3. Authored the contract; `contract emit` passed first try.
4. Deploy-first discipline per the skill's migration-model reference: baseline before first deploy. `migration plan --name init` wrote the full-create baseline. **Agent mistake:** ran `migration plan` a second time to re-capture output; the CLI refused with `MIGRATION.PLAN_ORIGIN_UNKNOWN` instead of writing a duplicate full-create package. The structured refusal turned a classic agent failure mode (re-running a mutating command for its output) into a no-op. Points to the platform.
5. `db migrate --advance-ref db` applied 13 operations; `db verify` clean; `db` ref committed so later plans chain.
6. Seed ported to `db.orm` upserts (same owner UUID, same empty-string conventions). One `tsc` error: the ORM's create input types `Json` columns as `JsonValue` and refused `unknown` — strict in the right place; fixed by typing the export file.
7. **Validation gate green:** `npm run db:validate` reads all rows through the new client, applies the app's exact read-path conversion, and validates against the untouched Zod schemas. 19 recipes, 4 bookmarks, 1 user; both schemas pass. The "components need zero changes" invariant holds at the data layer before any app code was touched.

### Deliberate schema tightening (vs. the old DB)

Foreign keys with `ON DELETE CASCADE` (bookmarks) / `SET NULL` (recipes.user_id), `UNIQUE (user_id, recipe_id)` on bookmarks, `NOT NULL` on bookmark FKs, and an index on `recipes.created_at`. None existed in the Drizzle-era database; the app's Zod schemas already assumed the stricter shapes. Prisma 8's generated no-NULL-elements check on `tags` is new but vacuous for this data.

### Cause classification

- `agent-mistake` — the double `migration plan` (caught by the CLI, zero damage).
- `existing-code` — untyped `unknown` jsonb in the old seed surfaced by stricter ORM input types.
- `prisma-platform` (minor) — the pg driver prints an sslmode/libpq-compat deprecation warning on every connect to Prisma Postgres's own recommended URL format; cosmetic but noisy for a first-party pairing. Also the `latest`-is-an-RC npm tagging noted above.
- Neutral: the lockfile refresh from installing Prisma bumped prettier, which reformatted 4 unrelated app files; kept (CI formats with the new version), noise in the diff.

### Verification

`contract emit` clean · `db verify` clean · `tsc --noEmit` clean · lint 0 errors (2 pre-existing warnings) · 103/103 unit tests · validation gate green.

---

## Entry 6 — Phase 2: query port, auth lookup, Drizzle/Neon removed (2026-10-27)

### Characterization-first

Before touching any query, 24 characterization tests pinned the external contract of all 8 data-access functions (camelCase rows with converted jsonb keys, string timestamps, Zod-validated returns, null/[] fallbacks, auth gating, session-derived ownership, cache revalidation). They were written and run green against the Drizzle implementation first, then the port happened, then the same assertions ran against the Prisma implementation. Only two kinds of test change were needed, both at the mock boundary, neither in an assertion: the mocked module path (`@/lib/db` → `@/prisma/db`) and the queue fixtures where Prisma returns a row-or-null where Drizzle returned an array (`first()`, `create()`, `update()`). A single generic proxy-based chainable mock served both ORMs' fluent APIs.

### The port itself

All 8 query functions plus the Auth.js `authorize` lookup moved to `db.orm.public.<Model>`. The diffs are small and mostly deletions. Notable:

- Ownership filters became `where({ id, userId })` shorthand objects — more legible than the SQL-combinator `and(eq(...), eq(...))` they replaced, and Prisma 8's compile-time "a write needs a filter on every code path" rule means an unscoped `update`/`delete` would not even typecheck. The security contract is now partially machine-enforced.
- `updateRecipe` no longer hand-sets `updatedAt`; the contract's `@onUpdate(now())` owns it.
- The Drizzle version needed `as never` casts to write jsonb; Prisma 8's typed `JsonValue` create inputs accepted the same `objectToSnake(...)` output with **no cast**. The whole phase typechecked on the first `tsc` run after the port.

### Removal

`drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless` uninstalled; `src/lib/db/{index,schema,seed}.ts`, the drizzle `migrations/` dir and `drizzle.config.ts` deleted; `db:*` scripts are now Prisma-native (`db:migrate`, `db:verify`, `db:seed`, `db:validate`, `contract:emit`). AGENTS.md updated to describe the new stack (including pointing future agents at the synced prisma-8 skill).

### Cause classification

Nothing to classify: **zero Prisma-platform friction in this phase**, zero human interventions beyond review, and the one historical wart (the `as never` jsonb cast) was existing-code debt the new ORM's types eliminated. After the Phase 0 install saga, this is the counterweight the honest version of the story needs: once running, the contract-first core plus the shipped skill made the actual migration work almost frictionless.

### Verification

`tsc --noEmit` clean (first run) · lint 0 errors · 127/127 tests (103 existing + 24 characterization, zero assertion changes across the port) · `db:validate` green against live data · production build SSG'd the home page and all 19 recipe pages through the Prisma client · runtime smoke test of the built app: home and recipe detail render the real recipe data.

---

## Entry 7 — Phase 3: Composer app, Compute deploy wiring (2026-10-28)

### The Phase 0 mystery, finally solved

The `prisma/cloud-deploy-action` README states: "Connecting a repository through the Prisma Console **creates this setup for you with a pull request**." So the Console's setup job (the one that failed three times at `npm install`, entries 1–3) exists to generate a deploy-workflow PR, and the "Waiting for GitHub to start the first deployment" state (entry 4) was waiting for a workflow that was never created because that job never succeeded. Root cause of the whole saga: one opaque, lockfile-blind install step blocked the automation whose output would have explained what the integration expected. Classification stays `prisma-platform`; the fix on our side is authoring the workflow by hand.

### The architectural decision: bridging two configuration models

Composer's binding principle is "your code never reads its environment" — dependencies and credentials arrive typed through the service node (`service.load()` / `service.input()`), and the platform does NOT inject env vars. This app (like most existing Next.js apps) reads `process.env` in three places: the Prisma client (`DATABASE_URL`), Auth.js (`AUTH_SECRET`), and `@vercel/blob` (`BLOB_READ_WRITE_TOKEN`) — the last two inside libraries we don't control. The canonical porting pattern (pages import the service and call `load()` per request) would have forced lazy-config rewrites of `auth.ts` and the upload route.

Chosen bridge: `src/instrumentation.ts` (Next's boot hook) calls `service.load()`/`service.input()` once at server start and assigns the three env vars before any app module reads them. Under local dev/CI, `load()` throws and `.env.local` keeps working. Zero changes to `db.ts`, `auth.ts`, or the upload route. Honest assessment: this trades Composer's purity for blast-radius control; a greenfield app should use the typed bindings directly.

### What was added

- `module.ts` — root module provisioning the ORM-typed database (`postgres({ name: 'database', contract, config })`, so **deploys replay the committed migrations**) and the web service, with `AUTH_SECRET` / `BLOB_READ_WRITE_TOKEN` bound via `envSecret` (first deploy seeds platform variables from the CI runner's env).
- `src/service.ts` — the Next.js compute service (`nextjs` build adapter, arktype input schema with `secretString()` fields).
- `src/prisma/data.ts` — the `dataContract` wrapper both ends reference.
- `prisma.config.ts` — now envelope + `composer` section (`prismaCloud({ region: 'ap-northeast-1' })`, `nextjsBuild()`, `prismaState()`); `definePrismaConfig` import moved to `prisma/config` per the Composer docs.
- `.github/workflows/prisma-deploy.yml` — `prisma/cloud-deploy-action@v1` with OIDC (repo already connected in the Console, so no stored token). Default branch → production; other branches → preview stages named after them. No teardown job: the action's destroy mode is a documented known limitation (currently fails against the current CLI).
- `next.config.ts` → `output: 'standalone'`; `@vercel/analytics` / `@vercel/speed-insights` removed (Vercel-host-only).

### The trade: prerendering is gone on the DB-backed routes

`/` (was ISR 1h) and `/recipes/[id]` (was SSG via `generateStaticParams` + ISR) are now `force-dynamic`: the runtime environment does not exist at Compute build time, so pages that query the database cannot prerender. For a two-user site on scale-to-zero compute this is a fair trade, but it is a real regression class for bigger apps and the docs are matter-of-fact about it. The flip side: CI builds no longer need any database access.

### Housekeeping findings

- `@prisma/composer` released 0.35.0 between our skill sync and install; `prisma skills sync` reconciled the local skill in one command. The versioned-skill model keeps proving itself.
- Scale-to-zero can close idle DB connections as unawaited async errors; per the platform guidance, the instrumentation bridge installs process-level handlers that log instead of crash-looping.

### Verification and open items

`tsc` clean on first run · lint 0 errors · 127/127 tests · standalone build green locally with `/` and `/recipes/[id]` now dynamic. **Not yet verified** (needs the push): whether the CI build passes with no env present (does `postgres()` tolerate an undefined URL at import?), and the deploy itself. [HUMAN] required before the first deploy: add `AUTH_SECRET` and `BLOB_READ_WRITE_TOKEN` as GitHub Actions secrets. The provisioned production database starts empty and gets its schema from the replayed migrations; the data seed against it is a one-time [HUMAN]-assisted step after the first successful deploy.

---

## Entry 8 — First deploy: one real platform bug, then success (2026-10-28)

### What happened

The first two deploy runs failed identically at the "check environment variables" step:

```
✘ [DEPLOY.PREFLIGHT_FAILED] prisma-cloud: the address "web" is not inside the app "yumyumyumi".
```

The error's own `docs:` link points at the CLI error reference, which has no `DEPLOY` namespace at all — the error is undocumented at the address the error itself prints. [HUMAN] added the GitHub secrets between the two runs, ruling missing variables out: the failure was structural.

### Diagnosis (from the installed package source, since the docs dead-ended)

The thrown message lives in `@prisma/composer-prisma-cloud` 0.35.0, inside a legacy-compat shim introduced by ADR-0057 (mapping resource IDs from releases "when an address left out the app name"). Something on the first-deploy path hands it an already-stripped address (`web` instead of `yumyumyumi.web`) and the shim throws. Version 0.34.0 — the version the package-owned Composer skill was authored against — does not contain that code path at all. 0.35.0 had been published between our skill sync and `npm install`, so "install latest" silently crossed a breaking minor.

### Resolution

Pinned `@prisma/composer` and `@prisma/composer-prisma-cloud` to 0.34.0 and re-synced skills. The next run deployed cleanly:

```
✔ Deployed yumyumyumi to feat/phase3-compute-deploy in 1m 11s.
web  compute-service  https://v75355yyvimlkvluppxlmk90.nrt.prisma.build
```

Preview stage in Tokyo, with its own database provisioned and the committed baseline migration replayed by the deploy — the deploy-first discipline from entry 5 paying off exactly as designed.

### Verification of the deployed stage

- Home, login: 200, full app UI renders. (The stage DB is empty by design, so the recipe list is the empty state.)
- A request for a nonexistent recipe renders the 404 page — `getRecipeById` executed a real query against the stage database and returned null. **The DATABASE_URL bridge works.**
- `/api/auth/session` returns `200` with a clean `null` — Auth.js booted with a working secret (it errors without one). **The envSecret bridge works.**
- The CI build question from entry 7 is answered: `npm run build` passes on a runner with no database env at all.

### A smaller find, fixed

Next compiles `instrumentation.ts` for the edge runtime too, where `process.on` is illegal — the build printed non-fatal "Ecmascript file had an error" noise on every run. Split the node-only bridge behind a conditional dynamic import (`instrumentation-node.ts`); build output is clean now. Cause: `agent-mistake` (the split-file pattern is documented in Next's docs).

### Cause classification

- `prisma-platform` — a fresh minor of `@prisma/composer` breaks first deploys, and its error message points at documentation that does not exist. The mitigation is the same version-coupling discipline Prisma's own ORM skill teaches: pin the Composer packages to the skill's `library_version`.
- `agent-mistake` — the instrumentation edge-runtime noise.
- The missing-secrets first run was [HUMAN]-resolved but turned out not to be the blocker.

### Open

Production deploy happens when this PR merges to main (new production database, migrations replayed, then a one-time data seed [HUMAN-assisted: needs the production DB's connection string from the Console]).

---

## Entry 9 — Production deploy: the manually-created database collides with Composer ownership (2026-10-28/29)

### What happened

The merge to main triggered the production deploy, which failed at plan-and-apply with `HostedStateBootstrapError`: the production branch already held one resource — `yumyumyumi-production`, the database created **manually in the Console back in Phase 0** — and Composer refuses to deploy into a branch holding resources it has no deploy state for, because "a deploy would try to recreate them and a destroy would remove nothing."

### Assessment: this error is how errors should look

After the opaque setup-job failures (entries 1–3) and the undocumented preflight error (entry 8), this one named the exact resource, explained the risk it was refusing, and listed the three exits (delete the stage, remove the foreign resources, or deploy into a different project). Diagnosis took one read. Classification: `existing-code` in spirit — the manual database predated the Composer app and squatted in the branch Composer expected to own; the refusal itself is the platform behaving well.

### Resolution

- [HUMAN] Deleted `yumyumyumi-production` in the Console (its contents are fully reproducible from `data-export/` + the seed) and re-ran the deploy: `✔ Deployed yumyumyumi to production in 58.6s`, with the production database provisioned by Composer and the baseline migration replayed.
- [HUMAN] Seeded the new production database (`DATABASE_URL=<production url> npm run db:seed`, connection string from the Console) and ran the validation gate against it: green.

Lesson for the article: on this platform, resources the app declares should be born from a deploy, not the Console. The hand-made database that bootstrapped Phases 1–2 had to die for production to deploy.

### Phase 4 verification (production, Tokyo)

- Home renders the real seeded recipes. Cold start after scale-to-zero: **8.4s** to first byte on the first request; warm requests ~0.9s. The trade named in entry 7, now measured.
- Recipe detail renders full content (ingredients/directions sections); a nonexistent id renders the not-found page (served with HTTP 200 through the ingress — quirk noted).
- `/api/auth/session` 200, login page 200.
- [HUMAN] Authenticated flows verified by hand in the browser: login, recipe create/edit/delete, bookmark toggle, image upload to Vercel Blob via the bridged token.
- One-off: an HTTP/2 stream error (curl exit 92) on rapid successive requests during the cold start; not reproducible afterwards.

---

## Final summary

### What went smoothly

- **Prisma ORM 8 itself.** Contract authored correctly on the first emit, zero platform friction across the entire query port (Phase 2 had nothing to classify), stronger types than the Drizzle code it replaced (unscoped writes are compile errors; the `as never` jsonb casts became unnecessary), and the deploy-replayed migration graph worked exactly as designed from dev through preview to production.
- **The package-owned agent skills.** The decisive factor of the whole migration: versioned, routing-table-indexed references that made an unfamiliar, post-training-data product fully usable. `prisma skills sync` kept them matched to installed versions. Prisma 8's structured CLI refusals twice turned agent mistakes into no-ops.
- **The CI-driven deploy model.** OIDC with no stored token, per-branch preview stages with their own migrated databases, converge-not-script deploys (unchanged redeploy: 40s no-op).

### What was rough

- **The Console's GitHub setup job**: failed three times on a lockfile-blind `npm install` with an unreadable error report, which silently blocked the generated-workflow PR that would have explained the whole integration (root cause only emerged from the deploy action's README). The single largest time sink.
- **Version skew as a recurring trap**: npm's `latest` tag on the Prisma CLI is an 8.0 RC while `@prisma/client` latest is stable 7; `@prisma/composer` 0.35.0 (published days after our skill sync) breaks first deploys in an undocumented code path. Mitigation both times: pin to what the shipped skill was authored against.
- **Docs dead-ends at the worst moments**: the `DEPLOY` error namespace missing from the CLI error reference; the Compute Console surfacing states ("push to retry") that only Composer docs can decode.
- **Porting trade-offs**: Composer's config model ("code never reads its environment") versus an existing app's `process.env` assumptions needed a deliberate bridge (instrumentation hook), and DB-backed prerendering (ISR/SSG) is off on Compute — measured cost: ~8s cold starts on a scale-to-zero two-user site.

### Open issues

- Preview-stage teardown: the deploy action's destroy mode is a documented known limitation, so stale preview stages accumulate until destroyed by script.
- Not-found pages return HTTP 200 through the Compute ingress.
- The `@prisma/composer` 0.35.0 first-deploy bug and the docs gaps should be reported/contributed upstream.
- Custom domain for the production service not yet configured (out of migration scope).

### Human interventions: 14 total

- **Setup and credentials (6, expected):** repo clone + GitHub repo creation, Prisma workspace/database creation, GitHub secrets, production connection string + seed run.
- **Console error relays (4, platform visibility gap):** the agent cannot see the Prisma Console, so every setup-job failure and integration state needed a human courier. The single biggest structural friction for agent-driven use of the platform.
- **Decisions and vetoes (3):** Prisma 8 RC over stable 7; no `legacy-peer-deps` (upgrade properly instead); phased-PR workflow shape.
- **Destructive operation (1):** deleting the manually-created production database.

Phases 1–2 (the actual ORM migration) needed zero interventions. Everything human-shaped clustered around platform onboarding, credentials, and the Console.
