import type { Metadata } from 'next'

import { RecipeList } from '@/components/features/Home/RecipeList'
import { getRecipes } from '@/lib/db/queries/recipe/getRecipes'

// On Prisma Compute the database binding exists only at runtime, so this
// page renders per request instead of prerendering (see MIGRATION_LOG.md).
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'YumYumYumi',
  description: 'Find, save, and share your favorite recipes with YumYumYumi',
}

export default async function HomePage() {
  const recipes = await getRecipes()

  return <RecipeList initialRecipes={recipes} />
}
