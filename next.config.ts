import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server serve hydration/HMR assets when reached via 127.0.0.1
  // (e.g. from Playwright), not just "localhost".
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
