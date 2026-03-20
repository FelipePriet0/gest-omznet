/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbopack: {
      // Force Turbopack root to this web/ directory (avoids wrong root inference)
      root: __dirname,
    },
  },
};

module.exports = nextConfig;

