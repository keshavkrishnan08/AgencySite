/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The old route names went out in emails and Stripe return URLs before the
  // shell was rebuilt. They must keep working rather than 404.
  async redirects() {
    return [
      { source: '/brief', destination: '/updates', permanent: true },
      { source: '/chat', destination: '/chart', permanent: true },
      { source: '/account', destination: '/settings', permanent: true },
      // Surfaces merged or retired in the restructure: the reading lived on
      // two pages and timing on three, so each made the other look redundant.
      { source: '/reading', destination: '/chart', permanent: true },
      { source: '/outlook', destination: '/timing', permanent: true },
      { source: '/best-day', destination: '/timing', permanent: true },
      { source: '/compare', destination: '/chart', permanent: true },
      { source: '/compat', destination: '/chart', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
