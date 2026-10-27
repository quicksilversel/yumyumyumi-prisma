import { objectToCamel } from 'ts-case-convert'

import type { Recipe } from '@/types/recipe'

import { isValidOf } from '@/lib/functions/isValidOf'
import { db } from '@/prisma/db'
import { recipeListSchema } from '@/types/recipe'

export async function getRecipes(): Promise<Recipe[]> {
  try {
    const data = await db.orm.public.Recipe.where({ isPublic: true })
      .orderBy((recipe) => recipe.createdAt.desc())
      .all()

    const camelCaseData = objectToCamel(data)

    if (!isValidOf(recipeListSchema, camelCaseData)) return []
    return camelCaseData
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('fetching recipes', error)
    return []
  }
}
