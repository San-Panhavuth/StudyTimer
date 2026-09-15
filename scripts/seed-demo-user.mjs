// Creates (or resets) a demo user directly via the Supabase Admin API.
// Usage: node scripts/seed-demo-user.mjs [email] [password] [displayName]
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from env (see .env.development.local
// for the local stack's values — printed by `supabase start`).
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: `.env.${process.env.NODE_ENV ?? "development"}.local`, override: true });

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Set them in your shell or .env.development.local before running this script.",
  );
  process.exit(1);
}

const email = process.argv[2] ?? "admin@velearien.test";
const password = process.argv[3] ?? "adminadmin";
const displayName = process.argv[4] ?? "Admin";

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: existingList } = await admin.auth.admin.listUsers();
const existing = existingList?.users.find((u) => u.email === email);

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (error) {
    console.error("Failed to update existing user:", error.message);
    process.exit(1);
  }
  console.log(`Updated existing user ${email} (${existing.id}) with the given password.`);
  process.exit(0);
}

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { display_name: displayName },
});

if (error) {
  console.error("createUser failed:", error.message);
  process.exit(1);
}

console.log(`Created user ${email} (${data.user.id}).`);
