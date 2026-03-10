import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
  },
  images: {
    remotePatterns: [
      // Clearbit logo API for company logos in job cards
      { protocol: "https", hostname: "logo.clearbit.com" },
      // Clerk avatar CDN
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
  // Required for @uiw/react-md-editor
  transpilePackages: ["@uiw/react-md-editor", "@uiw/react-markdown-preview"],
};

export default nextConfig;
