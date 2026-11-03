import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    // MinIO is only reachable from the browser via localhost:9000, not from
    // inside the frontend container — so Next's server-side image optimizer
    // (which re-fetches images server-side) can't resolve it. Serve product
    // images unoptimized so the browser fetches them directly instead.
    unoptimized: true,
    remotePatterns: [
      { protocol: "http", hostname: "localhost", port: "9000" },
      { protocol: "http", hostname: "minio", port: "9000" },
    ],
  },
};

export default nextConfig;
