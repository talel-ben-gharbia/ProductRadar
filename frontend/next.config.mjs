/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-navigation-menu",
    ],
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  serverExternalPackages: ["ioredis"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [
        { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
      ],
    },
    {
      source: "/B2C/products",
      headers: [
        { key: "Cache-Control", value: "public, max-age=30, stale-while-revalidate=60" },
      ],
    },
    {
      source: "/B2C/products/:id",
      headers: [
        { key: "Cache-Control", value: "public, max-age=30, stale-while-revalidate=60" },
      ],
    },
    {
      source: "/B2C/profile/:path*",
      headers: [
        { key: "Cache-Control", value: "private, max-age=0, must-revalidate" },
      ],
    },
    {
      source: "/B2B/dashboard/:path*",
      headers: [
        { key: "Cache-Control", value: "private, max-age=0, must-revalidate" },
      ],
    },
  ],
}

export default nextConfig
