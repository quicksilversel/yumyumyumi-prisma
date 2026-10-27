/**
 * Characterization tests pinning the external contract of the recipe
 * query functions through the ORM migration: camelCase rows (including
 * nested jsonb keys), string timestamps, Zod-validated returns, the
 * null/[] fallbacks, auth gating, and cache revalidation.
 */

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/prisma/db', async () => {
  const mock = await import('@/lib/vitest/dbMock')
  return { db: mock.mockDb }
})

import { revalidatePath } from 'next/cache'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

import type { Recipe } from '@/types/recipe'

import { auth } from '@/auth'
import {
  dbRejection,
  lastCall,
  mockDbQueue,
  resetDbMock,
} from '@/lib/vitest/dbMock'

import { createRecipe } from './createRecipe'
import { deleteRecipe } from './deleteRecipe'
import { getAllTags } from './getAllTags'
import { getRecipeById } from './getRecipeById'
import { getRecipes } from './getRecipes'
import { updateRecipe } from './updateRecipe'

const mockAuth = auth as unknown as Mock
const mockRevalidatePath = revalidatePath as unknown as Mock

const USER_ID = 'ac8f5cfe-a34f-44b6-a8ea-66aff226baa3'
const RECIPE_ID = '11111111-1111-4111-8111-111111111111'

/** A row as the database client returns it: camelCase columns, snake_case jsonb. */
const dbRecipe = {
  id: RECIPE_ID,
  userId: USER_ID,
  title: 'ミニトマトのチーズ和え',
  summary: '',
  tags: ['副菜', '時短'],
  tips: '',
  cookTime: 10,
  servings: 2,
  imageUrl: '',
  source: '',
  isPublic: true,
  createdAt: '2025-08-29 05:24:02.266082+00',
  updatedAt: '2025-09-08 03:36:20.024787+00',
  ingredients: [{ name: 'ミニトマト', amount: '12個', is_spice: false }],
  directions: [{ title: '和える', description: 'チーズと和える' }],
}

/** The same recipe as the app sees it: fully camelCase. */
const appRecipe: Recipe = {
  id: RECIPE_ID,
  userId: USER_ID,
  title: 'ミニトマトのチーズ和え',
  summary: '',
  tags: ['副菜', '時短'],
  tips: '',
  cookTime: 10,
  servings: 2,
  imageUrl: '',
  source: '',
  isPublic: true,
  createdAt: '2025-08-29 05:24:02.266082+00',
  updatedAt: '2025-09-08 03:36:20.024787+00',
  ingredients: [{ name: 'ミニトマト', amount: '12個', isSpice: false }],
  directions: [{ title: '和える', description: 'チーズと和える' }],
}

beforeEach(() => {
  resetDbMock()
  mockAuth.mockResolvedValue({ user: { id: USER_ID } })
})

describe('getRecipes', () => {
  it('returns camelCase recipes (nested jsonb keys included)', async () => {
    mockDbQueue.push([dbRecipe])
    expect(await getRecipes()).toEqual([appRecipe])
  })

  it('returns [] when rows fail schema validation', async () => {
    mockDbQueue.push([{ ...dbRecipe, title: undefined }])
    expect(await getRecipes()).toEqual([])
  })

  it('returns [] when the database throws', async () => {
    mockDbQueue.push(dbRejection(new Error('boom')))
    expect(await getRecipes()).toEqual([])
  })
})

describe('getRecipeById', () => {
  it('returns the camelCase recipe when found', async () => {
    mockDbQueue.push(dbRecipe)
    expect(await getRecipeById(RECIPE_ID)).toEqual(appRecipe)
  })

  it('returns null when not found', async () => {
    mockDbQueue.push(null)
    expect(await getRecipeById(RECIPE_ID)).toBeNull()
  })
})

describe('createRecipe', () => {
  const { id: _id, ...newRecipe } = appRecipe

  it('returns null without a session and performs no write', async () => {
    mockAuth.mockResolvedValue(null)
    expect(await createRecipe(newRecipe)).toBeNull()
    expect(lastCall('values') ?? lastCall('create')).toBeUndefined()
  })

  it('inserts with the session user id and snake_case jsonb, returns camelCase', async () => {
    mockDbQueue.push(dbRecipe)
    expect(await createRecipe(newRecipe)).toEqual(appRecipe)

    const write = lastCall('values') ?? lastCall('create')
    expect(write).toBeDefined()
    const inserted = write!.args[0] as Record<string, unknown>
    expect(inserted.userId).toBe(USER_ID)
    expect(inserted.ingredients).toEqual([
      { name: 'ミニトマト', amount: '12個', is_spice: false },
    ])
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('returns null when the returned row fails validation', async () => {
    mockDbQueue.push({ ...dbRecipe, title: undefined })
    expect(await createRecipe(newRecipe)).toBeNull()
  })
})

describe('updateRecipe', () => {
  const {
    id: _id,
    userId: _u,
    createdAt: _c,
    updatedAt: _m,
    ...form
  } = appRecipe

  it('returns null without a session', async () => {
    mockAuth.mockResolvedValue(null)
    expect(await updateRecipe(RECIPE_ID, form)).toBeNull()
  })

  it('updates and returns the camelCase recipe, revalidating paths', async () => {
    mockDbQueue.push(dbRecipe)
    expect(await updateRecipe(RECIPE_ID, form)).toEqual(appRecipe)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/recipes/${RECIPE_ID}`)
  })

  it('returns null when no row matches (wrong owner or id)', async () => {
    mockDbQueue.push(null)
    expect(await updateRecipe(RECIPE_ID, form)).toBeNull()
  })
})

describe('deleteRecipe', () => {
  it('returns false without a session', async () => {
    mockAuth.mockResolvedValue(null)
    expect(await deleteRecipe(RECIPE_ID)).toBe(false)
  })

  it('deletes and returns true', async () => {
    mockDbQueue.push(null)
    expect(await deleteRecipe(RECIPE_ID)).toBe(true)
    expect(mockRevalidatePath).toHaveBeenCalledWith('/')
  })

  it('returns false when the database throws', async () => {
    mockDbQueue.push(dbRejection(new Error('boom')))
    expect(await deleteRecipe(RECIPE_ID)).toBe(false)
  })
})

describe('getAllTags', () => {
  it('dedupes, sorts, and skips empty tag lists', async () => {
    mockDbQueue.push([
      { tags: ['時短', '副菜'] },
      { tags: ['副菜'] },
      { tags: null },
    ])
    expect(await getAllTags()).toEqual(['副菜', '時短'])
  })

  it('returns [] when the database throws', async () => {
    mockDbQueue.push(dbRejection(new Error('boom')))
    expect(await getAllTags()).toEqual([])
  })
})
