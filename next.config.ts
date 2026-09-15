import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server serve hydration/HMR assets when reached via 127.0.0.1
  // (e.g. from Playwright), not just "localhost".
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  experimental: {
    // Default staleTimes.dynamic is 0, so every Timer<->Log tab switch was
    // a full unmount + refetch — dropping filters, scroll position, and
    // replaying chart entrance animations even with no data change. This
    // keeps a recently-visited route's rendered tree alive for 30s so
    // switching back reuses it instead of remounting from scratch.
    staleTimes: { dynamic: 30 },
  },
};

export default nextConfig;
