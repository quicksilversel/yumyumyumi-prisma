'use server'

import { revalidatePath } from 'next/cache'
import { objectToCamel, objectToSnake } from 'ts-case-convert'

import type { Recipe } from '@/types/recipe'

import { auth } from '@/auth'
import { isValidOf } from '@/lib/functions/isValidOf'
import { db } from '@/prisma/db'
import { recipeSchema } from '@/types/recipe'

export async function createRecipe(
  recipe: Omit<Recipe, 'id'>,
): Promise<Recipe | null> {
  try {
    const session = await auth()
    if (!session?.user?.id) return null

    const { ingredients, directions, ...rest } = recipe

    const data = await db.orm.public.Recipe.create({
      ...rest,
      userId: session.user.id,
      // The DB stores the nested jsonb keys snake_case (is_spice); the app
      // uses camelCase. Same convention as the pre-Prisma implementation.
      ingredients: objectToSnake(ingredients),
      directions: objectToSnake(directions),
    })

    if (!data) return null

    const camelCaseData = objectToCamel(data)
    if (!isValidOf(recipeSchema, camelCaseData)) return null

    revalidatePath('/')
    revalidatePath('/recipes/[id]', 'page')

    return camelCaseData
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('creating recipe', error)
    return null
  }
}
