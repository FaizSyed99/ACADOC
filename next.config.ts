import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.56.1"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.BACKEND_API_URL 
          ? `${process.env.BACKEND_API_URL.replace(/\/$/, '')}/api/:path*` 
          : "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
