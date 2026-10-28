import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Prisma Compute's nextjs build adapter assembles the standalone output.
  output: 'standalone',

  ...(process.env.NODE_ENV !== 'production' && {
    cacheMaxMemorySize: 0,
  }),

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.public.blob.vercel-storage.com',
      },
    ],
  },

  compiler: {
    emotion: {
      sourceMap: process.env.NODE_ENV !== 'production',
      autoLabel: process.env.NODE_ENV !== 'production' ? 'always' : 'never',
      labelFormat: '[local]',
      importMap: {
        '@emotion/react': {
          styled: {
            canonicalImport: ['@emotion/styled', 'default'],
          },
        },
      },
    },
  },
}

export default nextConfig
