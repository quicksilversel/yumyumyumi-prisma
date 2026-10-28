import dotenv from 'dotenv'
import { defineConfig as composer } from '@prisma/composer/config'
import { nextjsBuild } from '@prisma/composer/nextjs/control'
import { prismaCloud, prismaState } from '@prisma/composer-prisma-cloud/control'
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config'
import { definePrismaConfig } from 'prisma/config'

// This repo keeps env in .env.local (Next.js convention); fall back to .env.
// dotenv does not override already-set values, so .env.local wins.
dotenv.config({ path: '.env.local' })
dotenv.config()

export default definePrismaConfig({
  orm: ormConfig({
    contract: './src/prisma/contract.prisma',
    db: {
      // CLI commands (migrate, verify, schema) need the direct connection;
      // the pooled URL is for the app runtime (src/prisma/db.ts).
      connection: (process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'])!,
    },
  }),
  composer: composer({
    extensions: [prismaCloud({ region: 'ap-northeast-1' }), nextjsBuild()],
    state: prismaState(),
  }),
})
