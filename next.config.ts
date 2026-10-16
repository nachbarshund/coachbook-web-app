import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { NextConfig } from "next";

/**
 * Version scheme: MAJOR.MINOR.PATCH
 * - MAJOR and MINOR come from package.json (bump them by hand).
 * - PATCH is the number of commits on the current branch, so it increases
 *   automatically with every push.
 */
function commitCount(): number | null {
  try {
    // Vercel clones shallowly; fetch the full history so the count is correct.
    if (execSync("git rev-parse --is-shallow-repository").toString().trim() === "true") {
      execSync("git fetch --unshallow", { stdio: "ignore" });
    }
    return Number(execSync("git rev-list --count HEAD").toString().trim());
  } catch {
    return null;
  }
}

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
const [major, minor, fallbackPatch] = pkg.version.split(".");
const patch = commitCount() ?? Number(fallbackPatch ?? 0);
const appVersion = `${major}.${minor}.${patch}`;

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

export default nextConfig;
