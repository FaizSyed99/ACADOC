import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.56.1"],
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: process.env.BACKEND_API_URL
          ? `${process.env.BACKEND_API_URL.startsWith('http') ? '' : 'https://'}${process.env.BACKEND_API_URL.replace(/\/$/, '')}/api/:path*`
          : "http://127.0.0.1:8000/api/:path*",
      },
    ];
  },
};

