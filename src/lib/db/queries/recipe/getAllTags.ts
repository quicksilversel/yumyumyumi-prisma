'use server'

import { db } from '@/prisma/db'

export async function getAllTags(): Promise<string[]> {
  try {
    const rows = await db.orm.public.Recipe.where({ isPublic: true })
      .select('tags')
      .all()

    const allTags = new Set<string>()

    rows.forEach((row) => {
      row.tags?.forEach((tag) => {
        if (tag) allTags.add(tag)
      })
    })

    return Array.from(allTags).sort()
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('fetching all tags', error)
    return []
  }
}
