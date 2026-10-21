import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@tailwindcss/postcss", "@tailwindcss/oxide"],
  turbopack: {
    rules: {
      "*.tsx": {
        condition: { query: "?raw" },
        type: "text",
      },
    },
  },
};

export default nextConfig;
