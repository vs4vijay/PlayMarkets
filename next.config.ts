import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Next.js / Turbopack from trying to bundle the native addon.
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
