import { colorForSubject } from "./format";
import type { StudySession } from "./data/types";

export const PAGE_SIZE = 6;
export const DAY_MS = 86400000;

export type LogFilters = {
  subjects: string[]; // empty = all subjects; otherwise exact subject names
  startDate: number | null; // day-start ms, inclusive
  endDate: number | null; // day-start ms, inclusive (whole day)
};

export function filterSessions(sessions: StudySession[], filters: LogFilters): StudySession[] {
  return sessions.filter((s) => {
    if (filters.subjects.length > 0 && !filters.subjects.includes(s.subject)) return false;
    if (filters.startDate != null && s.startTs < filters.startDate) return false;
    if (filters.endDate != null && s.startTs >= filters.endDate + DAY_MS) return false;
    return true;
  });
}

export type PieEntry = { label: string; minutes: number; color: string };

export function computePieEntries(sessions: StudySession[], includeBreak: boolean): PieEntry[] {
  const totals = new Map<string, number>();
  for (const s of sessions) {
    const sec = s.studySeconds + (includeBreak ? s.breakSeconds : 0);
    totals.set(s.subject, (totals.get(s.subject) ?? 0) + sec);
  }
  return Array.from(totals.entries())
    .filter(([, sec]) => sec > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([subject, sec]) => ({ label: subject, minutes: Math.round(sec / 60), color: colorForSubject(subject) }));
}

function dayStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export type BarWeek = { label: string; minutes: number };

export function computeBarWeeks(
  sessions: StudySession[],
  filters: LogFilters,
  includeBreak: boolean,
  now: number,
): BarWeek[] {
  const rangeEnd = filters.endDate != null ? filters.endDate + DAY_MS : now;
  const endRef = new Date(rangeEnd);
  const day = endRef.getDay();
  const diffToMon = day === 0 ? 6 : day - 1;
  const endMonday = new Date(endRef);
  endMonday.setHours(0, 0, 0, 0);
  endMonday.setDate(endRef.getDate() - diffToMon);

  let weekCount = 8;
  if (filters.startDate != null) {
    const spanWeeks = Math.ceil((endMonday.getTime() - dayStart(filters.startDate)) / (7 * DAY_MS)) + 1;
    weekCount = Math.min(26, Math.max(1, spanWeeks));
  }

  const weeks: { start: number; end: number; label: string }[] = [];
  for (let i = weekCount - 1; i >= 0; i--) {
    const start = new Date(endMonday);
    start.setDate(endMonday.getDate() - 7 * i);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    weeks.push({
      start: start.getTime(),
      end: end.getTime(),
      label: start.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    });
  }

  const totals = weeks.map(() => 0);
  for (const s of sessions) {
    for (let i = 0; i < weeks.length; i++) {
      if (s.startTs >= weeks[i].start && s.startTs < weeks[i].end) {
        totals[i] += (s.studySeconds + (includeBreak ? s.breakSeconds : 0)) / 60;
        break;
      }
    }
  }

  return weeks.map((w, i) => ({ label: w.label, minutes: totals[i] }));
}

export function paginate<T>(items: T[], page: number, pageSize = PAGE_SIZE): { pageItems: T[]; totalPages: number; page: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(Math.max(page, 1), totalPages);
  const pageItems = items.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);
  return { pageItems, totalPages, page: clampedPage };
}
