import type { NextConfig } from 'next';

// NO SERVER: static export served by Firebase Hosting (AGENTS.md §1).
// Forbidden here: API routes, route handlers, middleware, SSR/dynamic server rendering, next/image optimizer, rewrites/redirects in config.
const config: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  devIndicators: false,
};

export default config;
