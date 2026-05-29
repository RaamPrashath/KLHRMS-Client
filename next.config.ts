import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_HRMS_API_URL || process.env.HRMS_API_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/public/offers/:path*",
        destination: `${API_URL}/public/offers/:path*`,
      },
    ];
  },
};

export default nextConfig;
