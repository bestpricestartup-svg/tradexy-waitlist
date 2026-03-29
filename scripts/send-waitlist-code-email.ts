/**
 * Vienkartinis: waitlist OTP laiškas per sendWaitlistCode (DB + Resend).
 * Paleisk: npx tsx scripts/send-waitlist-code-email.ts [email]
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env.local");
const envText = fs.readFileSync(envPath, "utf8");
for (const line of envText.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  const k = t.slice(0, i).trim();
  let v = t.slice(i + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  process.env[k] = v;
}

async function main(): Promise<void> {
  const email = process.argv[2]?.trim() || "bestpricestartup@gmail.com";
  const { sendWaitlistCode } = await import("../lib/waitlist/code-service");
  const result = await sendWaitlistCode(email, "127.0.0.1");
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
