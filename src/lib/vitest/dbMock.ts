/**
 * Generic chainable database-client mock for characterization tests.
 *
 * Any property access returns a deeper chainable proxy and any call is
 * recorded, so the same mock serves both fluent APIs this repo has used
 * (Drizzle's `db.select().from(...)` and Prisma's `db.orm.public.Model
 * .where(...).all()`). Awaiting a chain pops the next item off
 * `mockDbQueue` — push one item per awaited statement, or a
 * `dbRejection(error)` to make that statement throw.
 */
export type DbCall = { path: string; args: unknown[] }

class DbRejection {
  constructor(public error: unknown) {}
}

export const dbRejection = (error: unknown) => new DbRejection(error)

export const mockDbQueue: unknown[] = []
export const mockDbCalls: DbCall[] = []

export function resetDbMock() {
  mockDbQueue.length = 0
  mockDbCalls.length = 0
}

/** Last recorded call whose path ends with the given segment. */
export function lastCall(pathSuffix: string): DbCall | undefined {
  return [...mockDbCalls].reverse().find((c) => c.path.endsWith(pathSuffix))
}

function make(path: string): unknown {
  const fn = () => undefined
  return new Proxy(fn, {
    get(_target, prop) {
      if (prop === 'then') {
        const item = mockDbQueue.length > 0 ? mockDbQueue.shift() : []
        return (
          resolve: (value: unknown) => unknown,
          reject: (error: unknown) => unknown,
        ) =>
          item instanceof DbRejection
            ? Promise.resolve().then(() => reject(item.error))
            : Promise.resolve(item).then(resolve)
      }
      if (typeof prop !== 'string') return undefined
      return make(path ? `${path}.${prop}` : prop)
    },
    apply(_target, _thisArg, args) {
      mockDbCalls.push({ path, args })
      return make(path)
    },
  })
}

export const mockDb = make('')
