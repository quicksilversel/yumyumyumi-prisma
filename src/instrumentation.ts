/**
 * Next.js instrumentation hook. The node-only work lives behind a dynamic
 * import so the edge-runtime compile of this file never sees `process.on`
 * (Next compiles instrumentation for every runtime).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' || !process.env.NEXT_RUNTIME) {
    const { bridgeComposerEnv } = await import('./instrumentation-node')
    await bridgeComposerEnv()
  }
}
