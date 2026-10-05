/** @type {import('next').NextConfig} */
const API_ORIGIN = process.env.API_PROXY_TARGET || 'http://localhost:5000';

const nextConfig = {
  // E2E runs pin browsers to 127.0.0.1 (avoids Firefox localhost/IPv6
  // connection-refused flakes); tell dev server that origin is first-party.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  async rewrites() {
    // Same-origin API proxy: cookies (httpOnly refresh session) become
    // first-party to the app, middleware can read them, and CORS vanishes.
    return [
      {
        source: '/api/v1/:path*',
        destination: `${API_ORIGIN}/api/v1/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${API_ORIGIN}/uploads/:path*`,
      },
    ];
  },
  eslint: {
    // QH-1: quality gates back ON. `next build` now fails on ESLint errors
    // (warnings still pass). If this blocks a hotfix, fix the lint error -
    // do not silently re-disable the gate.
    ignoreDuringBuilds: false,
  },
  typescript: {
    // QH-1: type errors fail the build. Run `npm run typecheck` locally.
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
