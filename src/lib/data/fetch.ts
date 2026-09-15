import { createClient } from "@/lib/supabase/server";
import type { ActiveSession, StudySession, Subject } from "./types";

const DEFAULT_SUBJECTS = [
  "Khmer",
  "English",
  "Physics",
  "Biology",
  "Chemistry",
  "Earth Science",
  "Morality & Civics",
  "Math",
  "IT",
  "Extra",
];

export async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export async function getProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();

  return {
    email: user.email ?? "",
    displayName: data?.display_name ?? "Guest",
  };
}

export async function getSubjects(): Promise<Subject[]> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Safety net: a fresh account should already have defaults from the
  // handle_new_user trigger, but if that ever failed to run, backfill here
  // so the app is never stuck with zero subjects.
  if (!data || data.length === 0) {
    const { data: inserted, error: insertError } = await supabase
      .from("subjects")
      .insert(DEFAULT_SUBJECTS.map((name) => ({ user_id: userId, name })))
      .select("id, name");
    if (insertError) throw insertError;
    return (inserted ?? []).map((s) => ({ id: s.id, name: s.name }));
  }

  return data.map((s) => ({ id: s.id, name: s.name }));
}

export async function getActiveSession(): Promise<ActiveSession | null> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("active_session")
    .select("subject_id, subject_name, start_ts, break_intervals, break_start, status")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const breakIntervals = Array.isArray(data.break_intervals)
    ? (data.break_intervals as { start: string; end: string }[]).map((b) => ({
        start: new Date(b.start).getTime(),
        end: new Date(b.end).getTime(),
      }))
    : [];

  return {
    subjectId: data.subject_id,
    subject: data.subject_name,
    startTs: new Date(data.start_ts).getTime(),
    breakIntervals,
    breakStart: data.break_start ? new Date(data.break_start).getTime() : null,
    status: data.status === "break" ? "break" : "running",
  };
}

export async function getSessions(): Promise<StudySession[]> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("sessions")
    .select("id, subject_id, subject_name, start_ts, end_ts, study_seconds, break_seconds")
    .eq("user_id", userId)
    .order("start_ts", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((s) => ({
    id: s.id,
    subjectId: s.subject_id,
    subject: s.subject_name,
    startTs: new Date(s.start_ts).getTime(),
    endTs: new Date(s.end_ts).getTime(),
    studySeconds: s.study_seconds,
    breakSeconds: s.break_seconds,
  }));
}
