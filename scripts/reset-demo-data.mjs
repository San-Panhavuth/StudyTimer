// Wipes the demo user's sessions/active_session rows so e2e runs start clean.
// Uses the service role key to bypass RLS. Local stack only — never point this
// at a hosted project without knowing exactly whose data you're deleting.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: `.env.${process.env.NODE_ENV ?? "development"}.local`, override: true });

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2] ?? "admin@velearien.test";

if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: list, error: listError } = await admin.auth.admin.listUsers();
if (listError) {
  console.error("listUsers failed:", listError.message);
  process.exit(1);
}
const user = list.users.find((u) => u.email === email);
if (!user) {
  console.log(`No user ${email} found — nothing to reset.`);
  process.exit(0);
}

await admin.from("sessions").delete().eq("user_id", user.id);
await admin.from("active_session").delete().eq("user_id", user.id);

console.log(`Reset sessions/active_session for ${email} (${user.id}).`);
