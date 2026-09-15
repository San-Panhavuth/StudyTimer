"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/data/fetch";
import type { ActiveSession, Subject } from "@/lib/data/types";

export async function addSubjectAction(name: string): Promise<Subject> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Subject name can't be empty.");

  const supabase = await createClient();
  const userId = await requireUserId();

  const { data: existing } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("user_id", userId)
    .eq("name", trimmed)
    .maybeSingle();

  if (existing) return { id: existing.id, name: existing.name };

  const { data, error } = await supabase
    .from("subjects")
    .insert({ user_id: userId, name: trimmed })
    .select("id, name")
    .single();

  if (error) throw error;
  return { id: data.id, name: data.name };
}

export async function renameSubjectAction(subjectId: string, name: string): Promise<Subject> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Subject name can't be empty.");

  const supabase = await createClient();
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("subjects")
    .update({ name: trimmed })
    .eq("id", subjectId)
    .eq("user_id", userId)
    .select("id, name")
    .single();

  if (error) throw error;
  return { id: data.id, name: data.name };
}

export async function deleteSubjectAction(subjectId: string): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  // Cascades to `sessions` and `active_session` at the DB level, so all
  // logged time for this subject disappears from the charts too.
  const { error } = await supabase.from("subjects").delete().eq("id", subjectId).eq("user_id", userId);

  if (error) throw error;
}

export async function deleteSessionAction(sessionId: string): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { error } = await supabase.from("sessions").delete().eq("id", sessionId).eq("user_id", userId);

  if (error) throw error;
}

export async function startSessionAction(subjectId: string, subjectName: string): Promise<ActiveSession> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const startTs = new Date().toISOString();

  const { error } = await supabase.from("active_session").upsert({
    user_id: userId,
    subject_id: subjectId,
    subject_name: subjectName,
    start_ts: startTs,
    break_intervals: [],
    break_start: null,
    status: "running",
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;

  return {
    subjectId,
    subject: subjectName,
    startTs: new Date(startTs).getTime(),
    breakIntervals: [],
    breakStart: null,
    status: "running",
  };
}

// toggleBreakAction and stopSessionAction take the caller's current
// ActiveSession instead of re-SELECTing it from the DB first — the client
// (timer-client.tsx) already holds the authoritative current state (it's
// exactly what these actions themselves last returned), so the old
// SELECT-then-UPDATE pattern was paying for a network round trip to fetch
// data the caller already had. Cuts each action from 3 round trips
// (auth + select + update) to 2 (auth + update).

export async function toggleBreakAction(current: ActiveSession): Promise<ActiveSession> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const breakIntervals = current.breakIntervals.map((b) => ({
    start: new Date(b.start).toISOString(),
    end: new Date(b.end).toISOString(),
  }));

  let nextStatus: "running" | "break";
  let nextBreakStart: string | null;
  let nextIntervals = breakIntervals;

  if (current.status === "break") {
    nextStatus = "running";
    nextBreakStart = null;
    if (current.breakStart) {
      nextIntervals = [...breakIntervals, { start: new Date(current.breakStart).toISOString(), end: new Date().toISOString() }];
    }
  } else {
    nextStatus = "break";
    nextBreakStart = new Date().toISOString();
  }

  const { error } = await supabase
    .from("active_session")
    .update({
      status: nextStatus,
      break_start: nextBreakStart,
      break_intervals: nextIntervals,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) throw error;

  return {
    subjectId: current.subjectId,
    subject: current.subject,
    startTs: current.startTs,
    breakIntervals: nextIntervals.map((b) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() })),
    breakStart: nextBreakStart ? new Date(nextBreakStart).getTime() : null,
    status: nextStatus,
  };
}

export async function stopSessionAction(current: ActiveSession): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const now = new Date();
  const breakIntervals = current.breakIntervals.map((b) => ({
    start: new Date(b.start).toISOString(),
    end: new Date(b.end).toISOString(),
  }));

  if (current.status === "break" && current.breakStart) {
    breakIntervals.push({ start: new Date(current.breakStart).toISOString(), end: now.toISOString() });
  }

  const totalBreakSec = breakIntervals.reduce(
    (sum, b) => sum + (new Date(b.end).getTime() - new Date(b.start).getTime()) / 1000,
    0,
  );
  const totalSec = (now.getTime() - current.startTs) / 1000;
  const studySec = Math.max(0, totalSec - totalBreakSec);

  const { error: insertError } = await supabase.from("sessions").insert({
    user_id: userId,
    subject_id: current.subjectId,
    subject_name: current.subject,
    start_ts: new Date(current.startTs).toISOString(),
    end_ts: now.toISOString(),
    study_seconds: Math.round(studySec),
    break_seconds: Math.round(totalBreakSec),
  });

  if (insertError) throw insertError;

  const { error: deleteError } = await supabase.from("active_session").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;
}
