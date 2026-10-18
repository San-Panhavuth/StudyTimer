// Creates (or resets) a child account and fills it with sample study sessions
// over the last couple of weeks, via the Supabase Admin API (no emails are sent).
// Usage: SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-sample-sessions.mjs <email> <password> [days]
// Existing sessions for that account are replaced, so re-running is safe.
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
const password = process.argv[3];
const days = Number(process.argv[4] ?? 14);

if (!url || !serviceKey || !email || !password) {
  console.error("Usage: SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-sample-sessions.mjs <email> <password> [days]");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

// Small deterministic PRNG so repeated runs produce the same-looking data.
let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const between = (min, max) => Math.floor(min + rand() * (max - min + 1));

// --- user ---------------------------------------------------------------
const { data: list, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
let user = list.users.find((u) => u.email === email);

if (user) {
  const { error } = await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  if (error) throw error;
  console.log(`Updated existing user ${email}`);
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Student" },
  });
  if (error) throw error;
  user = data.user;
  console.log(`Created user ${email}`);
}

// --- subjects (created by the handle_new_user trigger) -------------------
let { data: subjects, error: subjectError } = await admin.from("subjects").select("id, name").eq("user_id", user.id);
if (subjectError) throw subjectError;
if (!subjects?.length) {
  const defaults = ["Khmer", "English", "Physics", "Biology", "Chemistry", "Earth Science", "Morality & Civics", "Math", "IT", "Extra"];
  const { data, error } = await admin
    .from("subjects")
    .insert(defaults.map((name) => ({ user_id: user.id, name })))
    .select("id, name");
  if (error) throw error;
  subjects = data;
}

// --- sessions -----------------------------------------------------------
await admin.from("sessions").delete().eq("user_id", user.id);

const rows = [];
const now = new Date();
for (let d = days; d >= 1; d--) {
  // Skip a few days so the calendar has gaps.
  if (d % 5 === 0 || d === 8) continue;

  const perDay = between(1, 3);
  let hour = between(7, 16);
  for (let i = 0; i < perDay; i++) {
    const subject = pick(subjects);
    const studyMin = between(20, 95);
    const breakMin = between(0, Math.round(studyMin / 5));

    const start = new Date(now);
    start.setDate(now.getDate() - d);
    start.setHours(hour, between(0, 45), 0, 0);
    const end = new Date(start.getTime() + (studyMin + breakMin) * 60000);

    rows.push({
      user_id: user.id,
      subject_id: subject.id,
      subject_name: subject.name,
      start_ts: start.toISOString(),
      end_ts: end.toISOString(),
      study_seconds: studyMin * 60,
      break_seconds: breakMin * 60,
    });
    hour += between(2, 3);
  }
}

// Top up every subject to a few hours (3-10h, varied) so each one shows in the
// charts and the longest bars stress the axis/labels.
const targetMin = new Map(subjects.map((s) => [s.id, between(180, 600)]));
const studiedMin = new Map(subjects.map((s) => [s.id, 0]));
for (const r of rows) studiedMin.set(r.subject_id, studiedMin.get(r.subject_id) + r.study_seconds / 60);

for (const subject of subjects) {
  while (studiedMin.get(subject.id) < targetMin.get(subject.id)) {
    const studyMin = between(30, 120);
    const breakMin = between(0, Math.round(studyMin / 6));
    const start = new Date(now);
    start.setDate(now.getDate() - between(1, days));
    start.setHours(between(6, 20), between(0, 45), 0, 0);
    const end = new Date(start.getTime() + (studyMin + breakMin) * 60000);

    rows.push({
      user_id: user.id,
      subject_id: subject.id,
      subject_name: subject.name,
      start_ts: start.toISOString(),
      end_ts: end.toISOString(),
      study_seconds: studyMin * 60,
      break_seconds: breakMin * 60,
    });
    studiedMin.set(subject.id, studiedMin.get(subject.id) + studyMin);
  }
}

const { error: insertError } = await admin.from("sessions").insert(rows);
if (insertError) throw insertError;

const totalMin = rows.reduce((sum, r) => sum + r.study_seconds / 60, 0);
console.log(`Inserted ${rows.length} sessions over ${days} days (${Math.round(totalMin)} study minutes).`);
