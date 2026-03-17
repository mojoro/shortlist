import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

// Content-Security-Policy — unsafe-eval required by @uiw/react-md-editor internals
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://logo.clearbit.com https://img.clerk.com",
  "font-src 'self'",
  "connect-src 'self' https://api.clerk.com https://*.clerk.accounts.dev https://openrouter.ai",
  "frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  experimental: {
    reactCompiler: true,
    optimizePackageImports: ["date-fns", "@clerk/nextjs"],
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
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig);
