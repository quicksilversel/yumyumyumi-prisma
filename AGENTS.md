<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

---

# YumYumYumi

## Overview

A personal recipe site — a hobby project built for a friend to collect, view, and save recipes. Tiny audience (1–2 people), maintained by one person. The recipes are Japanese home cooking; the **product UI is in Japanese** (材料, 作り方, お気に入り, 〇〇分 / 〇人分, etc.). All meta-communication (PRs, comments, identifiers, this doc) is in **English**; user-facing copy and domain terms stay Japanese — preserve Japanese strings exactly when editing.

It is a single Next.js App Router app deployed on Vercel. It was migrated off Supabase to a stack that doesn't freeze on inactivity (the original Supabase free-tier project was paused and deleted).

## Tech Stack

- **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript 6** (strict)
- **Styling: Emotion** — `@emotion/styled` + `css` from `@emotion/react`, driven by a typed theme. SSR via a custom Emotion registry. **No Tailwind, no CSS modules, no shadcn.**
- **Database: Prisma Postgres** via **Prisma ORM 8** (contract-first: `src/prisma/contract.prisma` + `prisma contract emit` + `db.orm` runtime; migrations via `prisma migration plan` / `prisma db migrate`). Prisma 8 differs radically from classic Prisma — read the synced skill at `.agents/skills/prisma-8/SKILL.md` (regenerate with `npx prisma skills sync`) before touching the data layer.
- **Auth: Auth.js v5** (`next-auth@beta`) — Credentials provider, **single locked account** (no public signup)
- **Storage: Vercel Blob** (recipe images)
- **Forms:** React Hook Form + Zod (`zodResolver`)
- **Icons:** `lucide-react` (migrated off `@mui/icons-material`)
- **case conversion:** `ts-case-convert` (snake_case DB ↔ camelCase app)
- **Tests:** Vitest (jsdom) + `@testing-library/react`; Storybook 10 (stories run as a separate browser Vitest project)
- **Lint/format:** ESLint 9 (flat config) + Stylelint (recess-order, CSS-in-JS) + Prettier
- **Package manager:** npm

## Project Structure

```
src/
├── app/                      # App Router routes
│   ├── page.tsx              # Home — recipe list (ISR, revalidate 3600)
│   ├── recipes/[id]/         # Recipe detail (SSG + generateStaticParams)
│   ├── login/                # Single-account login
│   ├── account/              # Account page
│   └── api/
│       ├── auth/[...nextauth]/  # Auth.js handlers
│       └── upload-image/        # Vercel Blob upload (POST) + delete (DELETE)
├── auth.ts                   # Auth.js config (Credentials + bcrypt + jwt/session callbacks)
├── components/
│   ├── ui/                   # Shared design-system primitives (Button, Input, Dialog, Header, …)
│   └── features/             # Feature/page-specific components (Home/, Recipe/, Modals/)
├── contexts/                 # AuthContext (next-auth adapter), BookmarksContext, RecipeContext, Providers
├── hooks/                    # useBookmarks/, useRecipeActions/, useHydrated/ (folder-per-hook + index.ts)
├── lib/
│   ├── db/
│   │   ├── queries/          # recipe/ + bookmarks/ data access (see "Data flow")
│   │   └── storage/          # uploadImage / deleteImage / validateImage (client→API route)
│   ├── functions/            # pure helpers (isValidOf, …)
│   ├── imageCompression/     # browser-image-compression wrapper
│   ├── recipeIcons.ts        # deterministic brand icon picker (placeholder images)
│   └── vitest/setup.ts       # Vitest unit setup (mocks next/cache, sets test env; dbMock.ts for query tests)
├── prisma/
│   ├── contract.prisma       # Prisma 8 data contract (models: users, recipes, bookmarks)
│   ├── contract.json/.d.ts   # emitted artefacts (`npm run contract:emit`) — committed, never hand-edited
│   ├── db.ts                 # `db` runtime client (pooled DATABASE_URL) — server-only
│   ├── seed.ts               # seed (account + rescued recipes) — `npm run db:seed`
│   └── validate.ts           # Zod data-validation gate — `npm run db:validate`
├── styles/themes/            # theme tokens (colors, spacing, typography, borderRadius, shadow, transition) + theme.d.ts
└── types/                    # Zod schemas + inferred types (recipe.ts, bookmarks.ts, next-auth.d.ts)
data-export/                  # rescued recipe data (JSON/SQL) — seed source, NOT used at runtime
```

## Architecture & data flow

- **Server Components by default.** Add `'use client'` only for hooks/browser APIs/event handlers.
- **Reads** used by Server Components (`getRecipes`, `getRecipeById`) are plain async server functions, imported **directly from their files** (`@/lib/db/queries/recipe/getRecipes`).
- **Mutations and any read called from a client component** are **Server Actions** (`'use server'` at the top of the file): `createRecipe`, `updateRecipe`, `deleteRecipe`, `getAllTags`, `getBookmarks`, `toggleBookmark`.
- ⚠️ **Barrel rule:** the `queries/recipe/index.ts` barrel exports **only Server Actions**. Never re-export the server-only reads (which import the Prisma `db`) from a barrel that a client component imports — doing so bundles the DB client into the browser and crashes. Server Actions are safe to import from clients (they become RPC stubs); plain server functions are not.
- **Caching:** route-level ISR (`export const revalidate = 3600`) + on-demand **`revalidatePath`** in mutations. We do **not** use `unstable_cache` (Next 16's `revalidateTag` requires a cache profile; `revalidatePath` is the path we took).
- **Validation + case conversion:** every DB row is validated with Zod via `isValidOf` (`src/lib/functions/isValidOf`) and converted with `objectToCamel`/`objectToSnake`. The DB stores **snake_case** (including nested jsonb keys like `is_spice`); the app sees **camelCase** (`isSpice`). Keep this pipeline — don't hand-map fields.
- **Auth:** `auth.ts` exposes `handlers/auth/signIn/signOut`. Server-side code gets the user via `await auth()`; client code via the `useAuth()` adapter over `next-auth/react`. There is exactly one account — no signup flow.
- **Storage:** uploads/deletes go through `/api/upload-image` (Vercel Blob, `access: 'public'`, guarded by `auth()`). `next.config.ts` allowlists `**.public.blob.vercel-storage.com` for `next/image`.

## Data model

Three models in the Prisma 8 contract (`src/prisma/contract.prisma`), camelCase fields `@map`ped to snake_case columns:

1. `Recipe` — master recipe. `tags String[]?`, `ingredients`/`directions` as `Json` (nested keys snake_case), `isPublic`, timestamps as `TimestamptzString` (string values; `updatedAt` is set by `@onUpdate(now())`).
2. `bookmarks` — per-user saved recipes (`user_id`, `recipe_id`).
3. `users` — single account (`email` unique, `password_hash`).

The live data lives in **Prisma Postgres**, not in the repo. `data-export/recipes_export.json` is the seed/backup source. Relations have real FKs (`Cascade` on bookmarks, `SetNull` on recipes), and bookmarks are unique per `(userId, recipeId)`.

## Commands

```bash
npm install
npm run dev               # http://localhost:3000

npm run lint:fix && npm run lint   # eslint + stylelint + prettier (fix, then verify)
npx tsc --noEmit                   # typecheck
npm test                           # Vitest unit project (jsdom) — fast, no browser
npm run test:storybook             # Storybook stories in a real browser (Playwright)
npm run build                      # production build (Turbopack)

# Database (require DATABASE_URL + DIRECT_URL in .env.local; CLI uses DIRECT_URL)
npm run contract:emit    # re-emit contract.json/.d.ts after editing contract.prisma
npx prisma migration plan --name <slug>   # plan a migration from the contract diff
npm run db:migrate       # apply pending migrations (prisma db migrate)
npm run db:verify        # check the live DB matches the contract
npm run db:seed          # seed the account + rescued recipes (needs SEED_EMAIL/SEED_PASSWORD)
npm run db:validate      # Zod data-validation gate over live rows
```

---

# Code Conventions

These apply to all React/TypeScript code in this repo, at both write-time and review-time.

## Naming and structure

- **Component files are PascalCase** (`RecipeCard.tsx`); hooks/utilities/query functions are camelCase (`useBookmarks.ts`, `getRecipes.ts`).
- **Folder-per-unit with an `index.ts` barrel** for shared primitives, hooks, and query functions (`components/ui/RecipeImage/{RecipeImage.tsx,index.ts}`, `hooks/useBookmarks/{useBookmarks.ts,index.ts}`).
- **Path alias `@/*` → `src/*`.** No `../../../`.
- **Co-locate feature components** under `components/features/<Feature>/`. Shared, app-agnostic primitives go in `components/ui/`.

## Comments

- **Don't comment self-explanatory code.** Clear names and types are the documentation.
- **When a comment earns its place, prefer JSDoc** (`/** … */`) on the symbol. Reserve comments for the non-obvious — _why_ a choice was made, an invariant, a workaround, an edge case — never _what_ the line plainly does.

## Server / client / data flow

- **Server Components by default.** Add `'use client'` only when hooks, browser APIs, or event handlers are required; split an interactive bit into a small client child rather than making a whole tree client.
- **Mutations through Server Actions** (`'use server'`), validated server-side. Reserve `app/api/*` for webhooks/integrations (auth handlers, image upload).
- **Never import the Prisma `db` (`@/prisma/db`) into a client bundle.** Keep server-only reads out of any barrel a client imports (see the Barrel rule above).
- **Don't fetch in client components** when data can be fetched server-side; pass it down as props.
- **After a mutation, call `revalidatePath`** for the affected routes.

## Styling (Emotion)

- **Styling is Emotion `styled` components + the `css` helper from `@emotion/react`.** No Tailwind, no CSS modules, no other CSS-in-JS lib.
- **Use theme tokens, not hard-coded values:** `${({ theme }) => theme.colors.primary}`, `theme.spacing[4]`, `theme.typography.fontSize.sm`, `theme.borderRadius.md`, `theme.shadow.xs`, `theme.transition.default`. Tokens live in `src/styles/themes/`.
- **No inline `style={{}}`** except genuinely dynamic values that can't be a token (e.g. a computed `animationDelay`).
- **No `!important`.** Fix specificity at the cause.
- **Global styles / resets** live under `src/styles/` (`GlobalStyles`, `resetCss`, `customStyles`) — not scattered.
- **Stylelint enforces property order** (recess-order) on CSS-in-JS. Run `npm run lint:css:fix` after styling changes.
- **Size Lucide icons with `size` / `width` / `height`, never `font-size`** — Lucide renders fixed-size SVGs and ignores `font-size`. For "match the surrounding text," use `size="1em"` (or `svg { width: 1em; height: 1em }`).
- The brand accent is the pink `theme.colors.primary` (the header chrome). Use color as an accent; let content lead.

## React

- **Don't use `useEffect` for derived state** — compute during render. For client-only/after-hydration gating, use the `useHydrated()` hook (built on `useSyncExternalStore`) rather than a `setState`-in-effect.
- **List keys are stable IDs** (recipe id), not array indices.
- **`<Link>` for internal navigation; `<Image>` (next/image) for images** (the `RecipeImage` component wraps the no-photo placeholder + `objectFit`).
- **`useCallback`/`useMemo` only when measured.**

## TypeScript

- **No `any`.** Use `unknown` and narrow. (Test mocks may cast `as unknown as Mock` — that's the one accepted loosening.)
- **No `@ts-ignore`/`@ts-expect-error`** without an inline reason.
- **Honor strict null checks**; handle `null`/`undefined` explicitly.
- **Zod schemas in `src/types/` are the source of truth** for recipe/bookmark shapes; derive types with `z.infer`, don't duplicate.

## DRY and shared code

- **Extract when something is used 3+ times** — pure logic → `src/lib/`, hooks → `src/hooks/<name>/`, components → `components/ui/`.
- **Don't preemptively abstract.**
- **Single source of truth per concept:** recipe/bookmark shape → `src/types/`, theme tokens → `src/styles/themes/`, brand icon set → `src/lib/recipeIcons.ts`, env access → `.env.local` (+ `.env.example`).

## Forms and validation

- **All external input goes through a Zod schema** (`src/types/recipe.ts`, `bookmarks.ts`). Forms use `zodResolver`; Server Actions validate before writing (`isValidOf` / `safeParse`).
- **Server-side validation is the source of truth;** client validation is a UX nicety.

## Database

- **Prisma 8 ORM lane (`db.orm.public.<Model>`) by default — no raw SQL.** Drop to `db.sql` only for shapes the ORM can't express; consult `.agents/skills/prisma-8/references/queries-postgres.md` first.
- **Queries live in `src/lib/db/queries/`** (server actions / server-only modules), never in components.
- **Never import `db` in client components** (types are fine; the instance is server-only).
- Timestamps are `TimestamptzString` (string values; Zod expects strings); jsonb is stored snake_case to match the read-path conversion.

## Accessibility

- **Interactive elements have accessible names** (`aria-label`, visible text, or `aria-labelledby`).
- **Buttons for actions, links for navigation** — not `<div onClick>`.
- **Inputs have associated labels.** Respect `prefers-reduced-motion` for animations.

## Testing

- **Vitest.** Co-locate unit tests as `*.test.ts(x)` next to source.
- **`npm test` runs the `unit` project (jsdom)** — fast, no browser. Storybook stories run in a real browser via `npm run test:storybook` (separate Vitest project; needs Playwright Chromium).
- **Global test setup is `src/lib/vitest/setup.ts`** — it mocks `next/cache` and sets fake env vars. Mock `@/lib/db`, `@/auth`, and `@vercel/blob` per-test as needed.
- Use `// @vitest-environment node` for API-route tests; jsdom is the default.
- Server Actions / hooks get at least one happy-path and one failure-path test.

## Security

- **Never print or echo secret values in chat output.** Refer to secrets by name; use placeholders in example commands. Real values live in `.env.local` (gitignored; `.env.example` is the committed template).
- **No secrets in code**, no hard-coded credentials/tokens (even in tests — use placeholders).
- **No `dangerouslySetInnerHTML`** without explicit justification.

---

# Interaction Protocol

- For anything larger than a one-liner, propose a plan first; wait for confirmation; then write code.
- **After implementing, run `npm run lint:fix` then `npm run lint`**, plus `npx tsc --noEmit` and `npm test`. Fix anything flagged before declaring the work done. If a lint rule conflicts for a good reason, raise it rather than silently disabling it.
- When work is complete, show the diff. **Don't commit unless asked.** The working branch is typically a feature branch, not `main`.
- **`db:*` scripts hit the live Prisma Postgres database.** `db:migrate`/`db:seed` mutate real data. Confirm before running destructive ones.
- If fighting the type system suggests a Zod schema should be the source of truth, flag it instead of patching around.
- Preserve Japanese user-facing strings exactly; flag any that are still English (the UI should read fully Japanese).

# Important Notes

- **Single account.** There is one login (`SEED_EMAIL`/`SEED_PASSWORD`). The site's recipes are public (viewable logged-out); login only gates create/edit/delete and bookmarking. No signup UI.
- **Data lives in Prisma Postgres, not the repo.** `data-export/` holds the rescued recipe data used to seed; `src/prisma/seed.ts` seeds the account + recipes.
- **Free tiers.** Prisma Postgres idles at zero cost and auto-wakes (never deletes) — no keep-alive cron needed. `SessionProvider` uses `refetchOnWindowFocus={false}` to keep `/api/auth/session` calls minimal.
- If anything in this file, the Next.js block above, or `node_modules/next/dist/docs/` is wrong, stale, or contradictory, say so.

# Glossary

- **材料 (zairyō)** — ingredients. Stored as `recipes.ingredients` (jsonb: `{ name, amount, is_spice }`).
- **手順 / 作り方** — directions/steps. `recipes.directions` (jsonb: `{ title, description }`).
- **お気に入り** — bookmark/favorite. The `bookmarks` table; toggled via `toggleBookmark` Server Action.
- **調味料・スパイス** — seasoning/spice. Ingredients flagged `isSpice` are grouped separately (the `＜A＞` section) on the detail page.
- **〇〇分 / 〇人分** — cook time (minutes) / servings. `recipes.cookTime` / `recipes.servings`.
