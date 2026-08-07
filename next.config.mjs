/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24, // 24 hours image cache
  },
  experimental: {
    optimizePackageImports: [
      'framer-motion',
      '@fortawesome/free-solid-svg-icons',
      '@fortawesome/free-brands-svg-icons',
      '@fortawesome/react-fontawesome',
    ],
  },
  async redirects() {
    return [
      { source: '/auth/login', destination: '/login', permanent: true },
      { source: '/auth/register', destination: '/register', permanent: true },
      { source: '/llms.txt', destination: '/catalog.txt', permanent: true },
      { source: '/llms-full.txt', destination: '/catalog-full.txt', permanent: true },
      { source: '/servers', destination: '/servers/minecraft', permanent: true },
    ]
  },
};

export default nextConfig;
