import { objectToCamel } from 'ts-case-convert'

import { db } from './db'

import { isValidOf } from '../lib/functions/isValidOf'
import { bookmarkListSchema } from '../types/bookmarks'
import { recipeListSchema } from '../types/recipe'

/**
 * Data-validation gate: reads every row through the Prisma client and
 * validates it against the app's untouched Zod schemas. The migration's
 * contract is "components need zero changes", and this script is the check.
 * Run after every schema or data-layer step: npm run db:validate
 */
async function main() {
  const recipes = await db.orm.public.Recipe.orderBy((r) =>
    r.createdAt.desc(),
  ).all()
  const bookmarks = await db.orm.public.Bookmark.all()
  const users = await db.orm.public.User.select('id', 'email').all()

  console.warn(
    `rows: ${recipes.length} recipes, ${bookmarks.length} bookmarks, ${users.length} users`,
  )

  // Same conversion the app's read path applies: camelCase the whole row,
  // which also converts nested jsonb keys (is_spice → isSpice).
  const camelRecipes = recipes.map((r) => objectToCamel(r))
  if (!isValidOf(recipeListSchema, camelRecipes)) {
    const result = recipeListSchema.safeParse(camelRecipes)
    // eslint-disable-next-line no-console
    console.error(
      '✗ recipes failed Zod validation:',
      result.success ? '' : result.error.issues.slice(0, 10),
    )
    process.exitCode = 1
  } else {
    console.warn('✓ recipes pass recipeListSchema')
  }

  const camelBookmarks = bookmarks.map((b) => objectToCamel(b))
  if (!isValidOf(bookmarkListSchema, camelBookmarks)) {
    const result = bookmarkListSchema.safeParse(camelBookmarks)
    // eslint-disable-next-line no-console
    console.error(
      '✗ bookmarks failed Zod validation:',
      result.success ? '' : result.error.issues.slice(0, 10),
    )
    process.exitCode = 1
  } else {
    console.warn('✓ bookmarks pass bookmarkListSchema')
  }

  await db.close()
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
