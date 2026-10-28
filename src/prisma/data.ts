import { dataContract } from '@prisma/composer-prisma-cloud/orm'

import type { Contract } from './contract.d'

import contractJson from './contract.json' with { type: 'json' }

/**
 * The app's data contract wrapped into Composer's `postgres` kind — the one
 * value both ends reference: the resource end (`postgres({ name, contract,
 * config })` in module.ts) and the dependency end (`postgres(recipeData)` in
 * src/service.ts).
 */
export const recipeData = dataContract<Contract>(contractJson)
