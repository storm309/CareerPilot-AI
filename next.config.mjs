/** @type {import('next').NextConfig} */
const nextConfig = {
  // The Dockerfile copies .next/standalone, which only exists when this is set.
  // Vercel deploys natively and must not use it, so it is opt-in via env var.
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,

  // pdf-parse ships Node-only binaries; bundling it breaks the API route.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },

  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            // The interview needs these; nothing else should be able to ask.
            value: "camera=(self), microphone=(self), display-capture=(self), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
