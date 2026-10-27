import { objectToCamel } from 'ts-case-convert'

import type { Recipe } from '@/types/recipe'

import { isValidOf } from '@/lib/functions/isValidOf'
import { db } from '@/prisma/db'
import { recipeSchema } from '@/types/recipe'

export async function getRecipeById(id: string): Promise<Recipe | null> {
  try {
    const data = await db.orm.public.Recipe.first({ id })

    if (!data) return null

    const camelCaseData = objectToCamel(data)

    if (!isValidOf(recipeSchema, camelCaseData)) return null
    return camelCaseData
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('fetching recipe by ID', error)
    return null
  }
}
