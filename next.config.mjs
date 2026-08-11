/** @type {import('next').NextConfig} */
const nextConfig = {
  // "standalone" conflicts with Vercel's native deployment - removed
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse'],
  },
};

export default nextConfig;