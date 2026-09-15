import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ActiveSession, LinkedChild, Profile, StudySession, Subject } from "./types";

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

// `getUser()` makes a network round-trip to Supabase Auth to revalidate the
// token. Every fetch helper below needs it, and several run in parallel
// within the same request (layout + page), so without memoizing we were
// paying for that round-trip 3-4x per navigation. `cache()` dedupes it to
// once per request.
const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireUserId() {
  const user = await getAuthUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export const getProfile = cache(async function getProfile(): Promise<Profile | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, role, child_code")
    .eq("id", user.id)
    .maybeSingle();

  return {
    email: user.email ?? "",
    displayName: data?.display_name ?? "Guest",
    role: data?.role === "parent" ? "parent" : "child",
    childCode: data?.child_code ?? null,
  };
});

export async function getLinkedChildren(): Promise<LinkedChild[]> {
  const supabase = await createClient();
  await requireUserId();

  const { data, error } = await supabase.rpc("get_linked_children");
  if (error) throw error;

  type Row = { link_id: string; child_id: string; child_email: string; child_display_name: string; status: string; created_at: string };
  return ((data ?? []) as Row[]).map((r) => ({
    linkId: r.link_id,
    childId: r.child_id,
    childEmail: r.child_email,
    childDisplayName: r.child_display_name,
    status: r.status as "pending" | "approved" | "rejected",
    createdAt: new Date(r.created_at).getTime(),
  }));
}

function mapSessionRow(s: {
  id: string;
  subject_id: string;
  subject_name: string;
  start_ts: string;
  end_ts: string;
  study_seconds: number;
  break_seconds: number;
}): StudySession {
  return {
    id: s.id,
    subjectId: s.subject_id,
    subject: s.subject_name,
    startTs: new Date(s.start_ts).getTime(),
    endTs: new Date(s.end_ts).getTime(),
    studySeconds: s.study_seconds,
    breakSeconds: s.break_seconds,
  };
}

// RLS (sessions_select_as_approved_parent) enforces that the caller is
// actually an approved parent of childId — this just runs the query.
export async function getChildSessions(childId: string): Promise<StudySession[]> {
  const supabase = await createClient();
  await requireUserId();

  const { data, error } = await supabase
    .from("sessions")
    .select("id, subject_id, subject_name, start_ts, end_ts, study_seconds, break_seconds")
    .eq("user_id", childId)
    .order("start_ts", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapSessionRow);
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
  return (data ?? []).map(mapSessionRow);
}
