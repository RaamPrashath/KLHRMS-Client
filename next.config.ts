import type { NextConfig } from "next";
import { getHrmsApiUrl } from "./src/lib/deployment-env";

const API_URL = getHrmsApiUrl();

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/public/offers/:path*",
        destination: `${API_URL}/public/offers/:path*`,
      },
      {
        source: "/public/interviews/:path*",
        destination: `${API_URL}/public/interviews/:path*`,
      },
    ];
  },
};

export default nextConfig;
