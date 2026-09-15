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

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profiles, error: e1 } = await admin.from("profiles").select("id, display_name");
console.log("profiles:", profiles, e1?.message);

const { data: subjects, error: e2 } = await admin.from("subjects").select("name").order("name");
console.log(
  "subjects:",
  subjects?.map((s) => s.name),
  e2?.message,
);
