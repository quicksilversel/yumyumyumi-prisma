import { secretString } from '@prisma/composer/arktype'
import nextjs from '@prisma/composer/nextjs'
import { compute } from '@prisma/composer-prisma-cloud'
import { postgres } from '@prisma/composer-prisma-cloud/orm'
import { type } from 'arktype'

import { recipeData } from './prisma/data'

/**
 * The Next.js web service. Pure data: the platform wires `deps` and `input`
 * at deploy; src/instrumentation.ts reads them at boot via `service.load()`
 * / `service.input()` and bridges them to the env vars the app already uses.
 */
export default compute({
  name: 'web',
  deps: {
    db: postgres(recipeData),
  },
  input: type({
    authSecret: secretString(),
    blobToken: secretString(),
  }),
  build: nextjs({ module: import.meta.url, appDir: '..' }),
})
