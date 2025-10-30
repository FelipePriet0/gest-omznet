import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Next selects this folder as the workspace root for Turbopack
  // when multiple lockfiles exist in parent directories.
  // @ts-expect-error - 'turbopack' is currently not in NextConfig type
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
