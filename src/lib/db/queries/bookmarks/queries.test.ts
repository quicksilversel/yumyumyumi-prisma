/**
 * Characterization tests pinning the external contract of the bookmark
 * query functions through the ORM migration: camelCase validated rows,
 * auth gating, toggle semantics, and cache revalidation.
 */

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/db', async () => {
  const mock = await import('@/lib/vitest/dbMock')
  return { db: mock.mockDb }
})

import { revalidatePath } from 'next/cache'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import { auth } from '@/auth'
import {
  dbRejection,
  lastCall,
  mockDbQueue,
  resetDbMock,
} from '@/lib/vitest/dbMock'

import { getBookmarks } from './getBookmarks'
import { toggleBookmark } from './toggleBookmark'

const mockAuth = auth as unknown as Mock
const mockRevalidatePath = revalidatePath as unknown as Mock

const USER_ID = 'ac8f5cfe-a34f-44b6-a8ea-66aff226baa3'
const RECIPE_ID = '11111111-1111-4111-8111-111111111111'

const dbBookmark = {
  id: '862c7fb3-c019-4e88-b670-57f67ecc6be5',
  userId: USER_ID,
  recipeId: RECIPE_ID,
  createdAt: '2025-09-11 00:56:13.4017+00',
}

beforeEach(() => {
  resetDbMock()
  mockAuth.mockResolvedValue({ user: { id: USER_ID } })
})

describe('getBookmarks', () => {
  it('returns [] without a session', async () => {
    mockAuth.mockResolvedValue(null)
    expect(await getBookmarks()).toEqual([])
  })

  it('returns camelCase validated bookmarks', async () => {
    mockDbQueue.push([dbBookmark])
    expect(await getBookmarks()).toEqual([dbBookmark])
  })

  it('returns [] when rows fail schema validation', async () => {
    mockDbQueue.push([{ ...dbBookmark, recipeId: undefined }])
    expect(await getBookmarks()).toEqual([])
  })

  it('returns [] when the database throws', async () => {
    mockDbQueue.push(dbRejection(new Error('boom')))
    expect(await getBookmarks()).toEqual([])
  })
})

describe('toggleBookmark', () => {
  it('returns false without a session', async () => {
    mockAuth.mockResolvedValue(null)
    expect(await toggleBookmark(RECIPE_ID)).toBe(false)
  })

  it('removes an existing bookmark and returns false', async () => {
    mockDbQueue.push([{ id: dbBookmark.id }]) // existing lookup
    mockDbQueue.push([]) // delete
    expect(await toggleBookmark(RECIPE_ID)).toBe(false)
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/recipes/${RECIPE_ID}`)
  })

  it('creates a bookmark for the session user and returns true', async () => {
    mockDbQueue.push([]) // existing lookup: none
    mockDbQueue.push([]) // insert
    expect(await toggleBookmark(RECIPE_ID)).toBe(true)

    const write = lastCall('values') ?? lastCall('create')
    expect(write).toBeDefined()
    const inserted = write!.args[0] as Record<string, unknown>
    expect(inserted.userId).toBe(USER_ID)
    expect(inserted.recipeId).toBe(RECIPE_ID)
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/recipes/${RECIPE_ID}`)
  })

  it('returns false when the database throws', async () => {
    mockDbQueue.push(dbRejection(new Error('boom')))
    expect(await toggleBookmark(RECIPE_ID)).toBe(false)
  })
})
