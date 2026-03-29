import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
const env = fs.readFileSync(envPath, "utf8");
function get(name) {
  const m = env.match(new RegExp("^" + name + "=(.+)$", "m"));
  return m ? m[1].trim() : "";
}

const url = get("NEXT_PUBLIC_SUPABASE_URL");
const key = get("SUPABASE_SERVICE_ROLE_KEY");
const email = process.argv[2] || "bestpricestartup@gmail.com";

const supabase = createClient(url, key);

const tables = ["waitlist_codes", "waiting_list", "waitlist_attempts"];

for (const t of tables) {
  const { error, count } = await supabase.from(t).delete({ count: "exact" }).eq("email", email);
  if (error) {
    console.error(t, error.message);
    process.exitCode = 1;
  } else {
    console.log(t + ": ok");
  }
}
