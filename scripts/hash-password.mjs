// Usage: node scripts/hash-password.mjs "your-password"
// Prints a value for ADMIN_PASSWORD_HASH. Store it in .env.local or Vercel env vars.
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "your-password"');
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 64);
console.log(`scrypt$${salt.toString("base64")}$${hash.toString("base64")}`);
