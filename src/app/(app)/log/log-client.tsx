"use client";

import { useMemo, useState, useTransition } from "react";
import Sheet from "@/components/sheet";
import PieChart from "@/components/pie-chart";
import BarChart from "@/components/bar-chart";
import { fmtDate, fmtDateRange, fmtMin } from "@/lib/format";
import { PAGE_SIZE, computeBarWeeks, computePieEntries, filterSessions, paginate } from "@/lib/log-calculations";
import { deleteSessionAction } from "../actions";
import type { StudySession } from "@/lib/data/types";

function toDateInputValue(ts: number) {
  const d = new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fromDateInputValue(str: string): number | null {
  if (!str) return null;
  const [y, m, d] = str.split("-").map((n) => parseInt(n, 10));
  const date = new Date(y, m - 1, d);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export default function LogClient({ sessions }: { sessions: StudySession[] }) {
  const [sessionList, setSessionList] = useState(sessions);
  const [subjectFilter, setSubjectFilter] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<number | null>(null);
  const [includeBreakOn, setIncludeBreakOn] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const [dateOpen, setDateOpen] = useState(false);
  const [tempStart, setTempStart] = useState("");
  const [tempEnd, setTempEnd] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StudySession | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [now] = useState(() => Date.now());
  const todayMax = useMemo(() => toDateInputValue(now), [now]);

  const filters = useMemo(() => ({ subjects: subjectFilter, startDate, endDate }), [subjectFilter, startDate, endDate]);
  // Pie chart always shows every subject (date range only, no subject
  // filter) so a hidden/dimmed subject can still be clicked to re-select —
  // filtering out its slice would remove the only way back in.
  const dateFilters = useMemo(() => ({ subjects: [], startDate, endDate }), [startDate, endDate]);

  function toggleSubjectFilter(name: string) {
    setSubjectFilter((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
    setCurrentPage(1);
  }

  function handlePieToggle(label: string) {
    if (label === "Break") {
      setIncludeBreakOn((v) => !v);
      return;
    }
    toggleSubjectFilter(label);
  }

  const filteredSessions = useMemo(() => filterSessions(sessionList, filters), [sessionList, filters]);
  const dateFilteredSessions = useMemo(() => filterSessions(sessionList, dateFilters), [sessionList, dateFilters]);

  const pieEntries = useMemo(
    () => computePieEntries(dateFilteredSessions, includeBreakOn),
    [dateFilteredSessions, includeBreakOn],
  );

  const barWeeks = useMemo(() => computeBarWeeks(filteredSessions, filters, now), [filteredSessions, filters, now]);

  const sorted = useMemo(() => [...filteredSessions].sort((a, b) => b.startTs - a.startTs), [filteredSessions]);
  const { pageItems, totalPages, page } = useMemo(() => paginate(sorted, currentPage), [sorted, currentPage]);

  const dateLabel =
    startDate == null && endDate == null
      ? "All time"
      : startDate != null && endDate != null
        ? `${new Date(startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(endDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
        : startDate != null
          ? `From ${new Date(startDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
          : `Until ${new Date(endDate!).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;

  function applyDateRange() {
    let s = fromDateInputValue(tempStart);
    let e = fromDateInputValue(tempEnd);
    if (s != null && e != null && s > e) [s, e] = [e, s];
    setStartDate(s);
    setEndDate(e);
    setCurrentPage(1);
    setDateOpen(false);
  }

  function clearDateRange() {
    setStartDate(null);
    setEndDate(null);
    setCurrentPage(1);
    setDateOpen(false);
  }

  function confirmDeleteSession() {
    const target = deleteTarget;
    if (!target) return;
    setDeleteTarget(null);
    startTransition(async () => {
      try {
        await deleteSessionAction(target.id);
        setSessionList((prev) => prev.filter((s) => s.id !== target.id));
      } catch {
        setError("Couldn't delete that session.");
      }
    });
  }

  return (
    <>
      <div className="tab-topbar">
        <div className="topbar-actions">
          <button
            className={`date-range-btn${startDate != null || endDate != null ? " on" : ""}`}
            onClick={() => {
              setTempStart(startDate != null ? toDateInputValue(startDate) : "");
              setTempEnd(endDate != null ? toDateInputValue(endDate) : "");
              setDateOpen(true);
            }}
          >
            <svg className="icon" viewBox="0 0 24 24" style={{ width: 15, height: 15 }}>
              <rect x="3" y="4" width="18" height="18" rx="3"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>{dateLabel}</span>
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Time by Subject</h2>
        <PieChart entries={pieEntries} selectedSubjects={subjectFilter} onToggleLabel={handlePieToggle} />
        <div className="chip-row">
          <button
            type="button"
            className={`chip-toggle${includeBreakOn ? " on" : ""}`}
            onClick={() => setIncludeBreakOn((v) => !v)}
          >
            {includeBreakOn ? "✓ Break included" : "+ Include break"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Weekly Totals</h2>
        <BarChart weeks={barWeeks} showBreak={includeBreakOn} />
      </div>

      <div className="card">
        <h2>Sessions</h2>
        {error && <div className="auth-error" style={{ width: "100%" }}>{error}</div>}
        <div className="session-list">
          {pageItems.length === 0 ? (
            <div className="empty-note">No sessions match these filters yet.</div>
          ) : (
            pageItems.map((s) => {
              const total = s.studySeconds + s.breakSeconds;
              const pct = total > 0 ? (s.studySeconds / total) * 100 : 100;
              return (
                <div className="session-card" key={s.id}>
                  <div className="session-top">
                    <span className="session-subject">{s.subject}</span>
                    <span className="session-date" suppressHydrationWarning>
                      {fmtDateRange(s.startTs, s.endTs)}
                    </span>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => setDeleteTarget(s)}
                      aria-label="Delete session"
                    >
                      <svg className="icon" viewBox="0 0 24 24">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                        <path d="M10 11v6"></path>
                        <path d="M14 11v6"></path>
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                      </svg>
                    </button>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct.toFixed(0)}%` }}></div>
                  </div>
                  <div className="session-meta">
                    <div className="stat-study">
                      <span className="stat-label">Study</span>
                      <span className="stat-value">{fmtMin(s.studySeconds)}</span>
                    </div>
                    <div className="stat-minor">
                      <span>
                        Break <b>{fmtMin(s.breakSeconds)}</b>
                      </span>
                      <span>
                        Total <b>{fmtMin(total)}</b>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {sorted.length > PAGE_SIZE && (
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setCurrentPage(page - 1)} aria-label="Previous page">
              <svg className="icon" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            </button>
            <span className="page-indicator">
              Page {page} of {totalPages}
            </span>
            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => setCurrentPage(page + 1)}
              aria-label="Next page"
            >
              <svg className="icon" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </button>
          </div>
        )}
      </div>

      <Sheet open={dateOpen} onClose={() => setDateOpen(false)} title="Date Range">
        <div className="date-field-row">
          <label className="field-label" htmlFor="startDateInput">
            Start
          </label>
          <input
            id="startDateInput"
            type="date"
            max={todayMax}
            value={tempStart}
            onChange={(e) => setTempStart(e.target.value)}
          />
        </div>
        <div className="date-field-row">
          <label className="field-label" htmlFor="endDateInput">
            End
          </label>
          <input
            id="endDateInput"
            type="date"
            max={todayMax}
            value={tempEnd}
            onChange={(e) => setTempEnd(e.target.value)}
          />
        </div>
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={clearDateRange}>
            Clear
          </button>
          <button className="btn btn-primary" onClick={applyDateRange}>
            Apply
          </button>
        </div>
      </Sheet>

      <Sheet open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete session?">
        <p>
          Delete this <b>{deleteTarget?.subject}</b> session from {deleteTarget ? fmtDate(deleteTarget.startTs) : ""}
          ? This can&apos;t be undone.
        </p>
        <button className="btn btn-stop" onClick={confirmDeleteSession} disabled={pending}>
          Yes, delete it
        </button>
        <button className="sheet-close" onClick={() => setDeleteTarget(null)}>
          Cancel
        </button>
      </Sheet>
    </>
  );
}
