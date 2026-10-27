'use server'

import { revalidatePath } from 'next/cache'

import { auth } from '@/auth'
import { db } from '@/prisma/db'

export async function toggleBookmark(recipeId: string): Promise<boolean> {
  try {
    const session = await auth()
    if (!session?.user?.id) return false

    const userId = session.user.id

    const existing = await db.orm.public.Bookmark.where({ userId, recipeId })
      .select('id')
      .first()

    let nowBookmarked: boolean

    if (existing) {
      await db.orm.public.Bookmark.where({ userId, recipeId }).delete()
      nowBookmarked = false
    } else {
      await db.orm.public.Bookmark.create({ userId, recipeId })
      nowBookmarked = true
    }

    revalidatePath(`/recipes/${recipeId}`)

    return nowBookmarked
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('toggling bookmark', error)
    return false
  }
}
