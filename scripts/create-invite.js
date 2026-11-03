import { randomBytes, createHash } from "node:crypto";
import { pool } from "../server/db.js";

const maxUses = Number.parseInt(process.argv[2] || "1", 10);
const expiresInDays = Number.parseInt(process.argv[3] || "7", 10);

if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100) {
  throw new Error("Usage: npm run invite:create -- [maxUses: 1-100] [expiresInDays: 1-365]");
}
if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 365) {
  throw new Error("Invite expiry must be between 1 and 365 days.");
}

const code = `VYRO-${randomBytes(18).toString("base64url").toUpperCase()}`;
const codeHash = createHash("sha256").update(code).digest("hex");

try {
  await pool.query(
    "INSERT INTO invite_codes (code_hash, max_uses, expires_at) VALUES ($1, $2, now() + ($3 * interval '1 day'))",
    [codeHash, maxUses, expiresInDays]
  );
  console.log("\nVYRO invite code (shown once):");
  console.log(code);
  console.log(`Uses: ${maxUses} | Expires in: ${expiresInDays} days\n`);
} finally {
  await pool.end();
}
