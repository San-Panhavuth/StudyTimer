import { execFileSync } from "node:child_process";

const BASE_URL = "http://localhost:3100";
const ROUTES_TO_WARM = ["/login", "/signup", "/forgot-password", "/timer", "/log"];

async function warmRoute(path: string) {
  // Turbopack (`next dev`) compiles each route lazily on first request, which is
  // slow enough to race Playwright's first click on a freshly navigated page.
  // Hitting every route once here — before any test runs — forces that
  // compilation up front instead of mid-test.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await fetch(`${BASE_URL}${path}`, { redirect: "manual" });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

export default async function globalSetup() {
  execFileSync("node", ["scripts/reset-demo-data.mjs"], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "development" },
  });

  for (const route of ROUTES_TO_WARM) {
    await warmRoute(route);
  }
}
