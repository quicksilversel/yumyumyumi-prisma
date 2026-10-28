import { notFound } from 'next/navigation'

import { RecipeDetail } from '@/components/features/Recipe/Recipe'
import { getRecipeById } from '@/lib/db/queries/recipe/getRecipeById'

// On Prisma Compute the database binding exists only at runtime, so this
// page renders per request instead of prerendering (see MIGRATION_LOG.md).
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const recipe = await getRecipeById(id)

  if (!recipe) {
    return {
      title: 'Recipe Not Found',
    }
  }

  return {
    title: `${recipe.title} - YumYumYumi`,
    description: recipe.summary || recipe.title,
  }
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const recipe = await getRecipeById(id)

  if (!recipe) {
    notFound()
  }

  return <RecipeDetail recipe={recipe} />
}
