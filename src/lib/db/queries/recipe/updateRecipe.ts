'use server'

import { revalidatePath } from 'next/cache'
import { objectToCamel, objectToSnake } from 'ts-case-convert'

import type { Recipe, RecipeForm } from '@/types/recipe'

import { auth } from '@/auth'
import { isValidOf } from '@/lib/functions/isValidOf'
import { db } from '@/prisma/db'
import { recipeSchema } from '@/types/recipe'

export async function updateRecipe(
  id: Recipe['id'],
  updates: RecipeForm,
): Promise<Recipe | null> {
  try {
    const session = await auth()
    if (!session?.user?.id) return null

    const { ingredients, directions, ...rest } = updates

    // updatedAt is set by the contract's @onUpdate(now()); ownership is
    // enforced by filtering on the session user, never the client's input.
    const data = await db.orm.public.Recipe.where({
      id,
      userId: session.user.id,
    }).update({
      ...rest,
      ingredients: objectToSnake(ingredients),
      directions: objectToSnake(directions),
    })

    if (!data) return null

    const camelCaseData = objectToCamel(data)
    if (!isValidOf(recipeSchema, camelCaseData)) return null

    revalidatePath('/')
    revalidatePath(`/recipes/${id}`)

    return camelCaseData
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('updating recipe', error)
    return null
  }
}
