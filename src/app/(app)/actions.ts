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

export async function toggleBreakAction(): Promise<ActiveSession> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { data: row, error: fetchError } = await supabase
    .from("active_session")
    .select("subject_id, subject_name, start_ts, break_intervals, break_start, status")
    .eq("user_id", userId)
    .single();

  if (fetchError) throw fetchError;

  const breakIntervals = Array.isArray(row.break_intervals)
    ? (row.break_intervals as { start: string; end: string }[])
    : [];

  let nextStatus: "running" | "break";
  let nextBreakStart: string | null;
  let nextIntervals = breakIntervals;

  if (row.status === "break") {
    nextStatus = "running";
    nextBreakStart = null;
    if (row.break_start) {
      nextIntervals = [...breakIntervals, { start: row.break_start, end: new Date().toISOString() }];
    }
  } else {
    nextStatus = "break";
    nextBreakStart = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from("active_session")
    .update({
      status: nextStatus,
      break_start: nextBreakStart,
      break_intervals: nextIntervals,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (updateError) throw updateError;

  return {
    subjectId: row.subject_id,
    subject: row.subject_name,
    startTs: new Date(row.start_ts).getTime(),
    breakIntervals: nextIntervals.map((b) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() })),
    breakStart: nextBreakStart ? new Date(nextBreakStart).getTime() : null,
    status: nextStatus,
  };
}

export async function stopSessionAction(): Promise<void> {
  const supabase = await createClient();
  const userId = await requireUserId();

  const { data: row, error: fetchError } = await supabase
    .from("active_session")
    .select("subject_id, subject_name, start_ts, break_intervals, break_start, status")
    .eq("user_id", userId)
    .single();

  if (fetchError) throw fetchError;

  const now = new Date();
  const breakIntervals: { start: string; end: string }[] = Array.isArray(row.break_intervals)
    ? [...(row.break_intervals as { start: string; end: string }[])]
    : [];

  if (row.status === "break" && row.break_start) {
    breakIntervals.push({ start: row.break_start, end: now.toISOString() });
  }

  const totalBreakSec = breakIntervals.reduce(
    (sum, b) => sum + (new Date(b.end).getTime() - new Date(b.start).getTime()) / 1000,
    0,
  );
  const startTs = new Date(row.start_ts);
  const totalSec = (now.getTime() - startTs.getTime()) / 1000;
  const studySec = Math.max(0, totalSec - totalBreakSec);

  const { error: insertError } = await supabase.from("sessions").insert({
    user_id: userId,
    subject_id: row.subject_id,
    subject_name: row.subject_name,
    start_ts: row.start_ts,
    end_ts: now.toISOString(),
    study_seconds: Math.round(studySec),
    break_seconds: Math.round(totalBreakSec),
  });

  if (insertError) throw insertError;

  const { error: deleteError } = await supabase.from("active_session").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;
}
