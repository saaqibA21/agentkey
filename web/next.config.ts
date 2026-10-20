import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  env: {
    AUTH_URL: "https://www.agentkey.in",
    NEXTAUTH_URL: "https://www.agentkey.in",
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default config;
