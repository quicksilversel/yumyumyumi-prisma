import dotenv from 'dotenv'
import { definePrismaConfig } from '@prisma/cli-engine'
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config'

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
})
