import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.56.1"],
<<<<<<< HEAD
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
=======
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
>>>>>>> 8e0541c62e9f3d0671ccde66e1831c4f33e95cfc
      },
    ],
  },
};

