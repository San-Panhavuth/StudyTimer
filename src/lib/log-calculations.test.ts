import { describe, expect, it } from "vitest";
import { computeBarWeeks, computePieEntries, filterSessions, paginate } from "./log-calculations";
import type { StudySession } from "./data/types";

function mkSession(overrides: Partial<StudySession>): StudySession {
  return {
    id: crypto.randomUUID(),
    subjectId: "subj-1",
    subject: "Math",
    startTs: Date.now(),
    endTs: Date.now(),
    studySeconds: 1800,
    breakSeconds: 300,
    ...overrides,
  };
}

describe("filterSessions", () => {
  const sessions = [
    mkSession({ id: "a", subject: "Math", startTs: new Date(2026, 8, 1).getTime() }),
    mkSession({ id: "b", subject: "Khmer", startTs: new Date(2026, 8, 5).getTime() }),
    mkSession({ id: "c", subject: "Math", startTs: new Date(2026, 8, 10).getTime() }),
  ];

  it("returns everything when no filters are set", () => {
    expect(filterSessions(sessions, { subjects: [], startDate: null, endDate: null })).toHaveLength(3);
  });

  it("filters by exact subject name", () => {
    const result = filterSessions(sessions, { subjects: ["Math"], startDate: null, endDate: null });
    expect(result.map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("filters by start date (inclusive)", () => {
    const result = filterSessions(sessions, {
      subjects: [],
      startDate: new Date(2026, 8, 5).getTime(),
      endDate: null,
    });
    expect(result.map((s) => s.id)).toEqual(["b", "c"]);
  });

  it("filters by end date (inclusive of the whole day)", () => {
    const result = filterSessions(sessions, {
      subjects: [],
      startDate: null,
      endDate: new Date(2026, 8, 5).getTime(),
    });
    expect(result.map((s) => s.id)).toEqual(["a", "b"]);
  });

  it("combines subject and date range filters", () => {
    const result = filterSessions(sessions, {
      subjects: ["Math"],
      startDate: new Date(2026, 8, 2).getTime(),
      endDate: null,
    });
    expect(result.map((s) => s.id)).toEqual(["c"]);
  });
});

describe("computePieEntries", () => {
  it("sums study seconds per subject and converts to minutes", () => {
    const sessions = [
      mkSession({ subject: "Math", studySeconds: 600, breakSeconds: 0 }),
      mkSession({ subject: "Math", studySeconds: 1200, breakSeconds: 0 }),
      mkSession({ subject: "Khmer", studySeconds: 300, breakSeconds: 0 }),
    ];
    const entries = computePieEntries(sessions, false);
    expect(entries).toEqual([
      { label: "Math", minutes: 30, color: expect.any(String) },
      { label: "Khmer", minutes: 5, color: expect.any(String) },
    ]);
  });

  it("adds break as its own entry, not merged into the subject, when includeBreak is true", () => {
    const sessions = [mkSession({ subject: "Math", studySeconds: 600, breakSeconds: 300 })];
    expect(computePieEntries(sessions, false)).toEqual([{ label: "Math", minutes: 10, color: expect.any(String) }]);
    const withBreak = computePieEntries(sessions, true);
    expect(withBreak).toEqual([
      { label: "Math", minutes: 10, color: expect.any(String) },
      { label: "Break", minutes: 5, color: expect.any(String) },
    ]);
  });

  it("excludes subjects with zero total time", () => {
    const sessions = [mkSession({ subject: "Math", studySeconds: 0, breakSeconds: 0 })];
    expect(computePieEntries(sessions, false)).toEqual([]);
  });

  it("sorts descending by total time", () => {
    const sessions = [
      mkSession({ subject: "Small", studySeconds: 60, breakSeconds: 0 }),
      mkSession({ subject: "Big", studySeconds: 6000, breakSeconds: 0 }),
    ];
    expect(computePieEntries(sessions, false).map((e) => e.label)).toEqual(["Big", "Small"]);
  });
});

describe("computeBarWeeks", () => {
  it("defaults to an 8-week span ending on the current week when no range is set", () => {
    const now = new Date(2026, 8, 15).getTime(); // Tuesday
    const weeks = computeBarWeeks([], { subjects: [], startDate: null, endDate: null }, now);
    expect(weeks).toHaveLength(8);
  });

  it("buckets a session's study and break minutes separately into the correct week", () => {
    const now = new Date(2026, 8, 15).getTime();
    const sessionInThisWeek = mkSession({
      startTs: new Date(2026, 8, 14).getTime(),
      studySeconds: 1200,
      breakSeconds: 600,
    });
    const weeks = computeBarWeeks([sessionInThisWeek], { subjects: [], startDate: null, endDate: null }, now);
    const totalStudy = weeks.reduce((sum, w) => sum + w.studyMinutes, 0);
    const totalBreak = weeks.reduce((sum, w) => sum + w.breakMinutes, 0);
    expect(totalStudy).toBe(20);
    expect(totalBreak).toBe(10);
  });

  it("expands the span to cover an explicit date range, capped at 26 weeks", () => {
    const now = new Date(2026, 8, 15).getTime();
    const farStart = new Date(2025, 0, 1).getTime(); // over a year back
    const weeks = computeBarWeeks([], { subjects: [], startDate: farStart, endDate: null }, now);
    expect(weeks).toHaveLength(26);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 14 }, (_, i) => i);

  it("returns the first page by default page size", () => {
    const { pageItems, totalPages, page } = paginate(items, 1);
    expect(pageItems).toEqual([0, 1, 2, 3, 4, 5]);
    expect(totalPages).toBe(3);
    expect(page).toBe(1);
  });

  it("returns the last (partial) page", () => {
    const { pageItems, page } = paginate(items, 3);
    expect(pageItems).toEqual([12, 13]);
    expect(page).toBe(3);
  });

  it("clamps an out-of-range page down to the last page", () => {
    const { page, pageItems } = paginate(items, 99);
    expect(page).toBe(3);
    expect(pageItems).toEqual([12, 13]);
  });

  it("clamps a page below 1 up to 1", () => {
    const { page } = paginate(items, 0);
    expect(page).toBe(1);
  });

  it("always reports at least 1 total page, even when empty", () => {
    const { totalPages, pageItems } = paginate([], 1);
    expect(totalPages).toBe(1);
    expect(pageItems).toEqual([]);
  });
});
