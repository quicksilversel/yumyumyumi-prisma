'use server'

import { revalidatePath } from 'next/cache'

import { auth } from '@/auth'
import { db } from '@/prisma/db'

export async function deleteRecipe(id: string): Promise<boolean> {
  try {
    const session = await auth()
    if (!session?.user?.id) return false

    await db.orm.public.Recipe.where({ id, userId: session.user.id }).delete()

    revalidatePath('/')
    revalidatePath('/recipes/[id]', 'page')

    return true
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('deleting recipe', error)
    return false
  }
}
