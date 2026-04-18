import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: async () => {
    return [
      {
        source: "/api/chat",
        destination: "http://127.0.0.1:8000/api/chat",
      },
      {
        source: "/api/health",
        destination: "http://127.0.0.1:8000/api/health",
      },
    ];
  },
};

export default nextConfig;
