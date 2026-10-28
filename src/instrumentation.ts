/**
 * Boot-time bridge between Prisma Composer and the app's existing env-based
 * configuration. Under Compute, dependencies and credentials arrive typed
 * through the service node (never as ambient env vars), so this hook reads
 * them once at server start and hands them to the code that already expects
 * `process.env` (src/prisma/db.ts, Auth.js, @vercel/blob). Outside Compute
 * (next dev, CI, scripts) `service.load()` throws and the app keeps reading
 * .env.local as before.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== 'nodejs') return

  try {
    const { default: service } = await import('./service')
    const { db } = service.load()
    const input = service.input()

    process.env.DATABASE_URL = db.url
    process.env.AUTH_SECRET = input.authSecret.expose()
    process.env.BLOB_READ_WRITE_TOKEN = input.blobToken.expose()

    // Scale-to-zero closes idle DB connections, which can surface as async
    // errors with no awaiter. Log them instead of dying into a restart loop;
    // the client reconnects on the next query.
    process.on('uncaughtException', (error) => {
      // eslint-disable-next-line no-console
      console.error('uncaughtException', error)
    })
    process.on('unhandledRejection', (error) => {
      // eslint-disable-next-line no-console
      console.error('unhandledRejection', error)
    })
  } catch {
    // Not running under Prisma Compute; .env.local provides the environment.
  }
}
