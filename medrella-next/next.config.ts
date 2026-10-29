import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  experimental: {
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
