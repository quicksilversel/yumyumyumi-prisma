import { fileURLToPath } from 'node:url'

import { module } from '@prisma/composer'
import { envSecret } from '@prisma/composer-prisma-cloud'
import { postgres } from '@prisma/composer-prisma-cloud/orm'

import { recipeData } from './src/prisma/data'
import webService from './src/service'

// The ORM config path: the deploy's migration step loads it to find the
// emitted contract.json and the committed migrations/ to replay.
const config = fileURLToPath(new URL('./prisma.config.ts', import.meta.url))

export default module('yumyumyumi', ({ provision }) => {
  const db = provision(
    postgres({ name: 'database', contract: recipeData, config }),
  )
  provision(webService, {
    deps: { db },
    input: {
      authSecret: envSecret('AUTH_SECRET'),
      blobToken: envSecret('BLOB_READ_WRITE_TOKEN'),
    },
  })
})
