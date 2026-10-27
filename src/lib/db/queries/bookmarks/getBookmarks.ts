'use server'

import { objectToCamel } from 'ts-case-convert'

import type { BookmarkList } from '@/types/bookmarks'

import { auth } from '@/auth'
import { isValidOf } from '@/lib/functions/isValidOf'
import { db } from '@/prisma/db'
import { bookmarkListSchema } from '@/types/bookmarks'

export async function getBookmarks(): Promise<BookmarkList> {
  try {
    const session = await auth()
    if (!session?.user?.id) return []

    const data = await db.orm.public.Bookmark.where({
      userId: session.user.id,
    })
      .orderBy((bookmark) => bookmark.createdAt.desc())
      .all()

    const camelCaseData = objectToCamel(data)

    if (!isValidOf(bookmarkListSchema, camelCaseData)) return []
    return camelCaseData
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('fetching bookmarks', error)
    return []
  }
}
