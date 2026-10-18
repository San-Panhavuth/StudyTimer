"use client";

import { useMemo, useState } from "react";
import BarChart, { type BarWeek } from "@/components/bar-chart";
import { fmtMin } from "@/lib/format";
import { computeStudyDays } from "@/lib/log-calculations";
import type { StudySession } from "@/lib/data/types";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const VIEWS = ["Weekly Totals", "Daily Progress"] as const;

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
      <polyline points={dir === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"}></polyline>
    </svg>
  );
}

// One card, two views: the weekly bar chart and a month calendar with a tick
// on every day that has study time. The header arrows switch between them.
export default function ProgressCard({
  weeks,
  showBreak,
  sessions,
  now,
}: {
  weeks: BarWeek[];
  showBreak: boolean;
  sessions: StudySession[];
  now: number;
}) {
  const [view, setView] = useState(0);
  // No enter animation on first render, only after the user flips the card.
  const [flipped, setFlipped] = useState(false);
  const today = useMemo(() => new Date(now), [now]);
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const studyDays = useMemo(
    () => computeStudyDays(sessions, cursor.year, cursor.month),
    [sessions, cursor.year, cursor.month],
  );

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const isCurrentMonth = cursor.year === today.getFullYear() && cursor.month === today.getMonth();
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  function shiftMonth(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Always six rows, so every month takes the same space.
  while (cells.length < 42) cells.push(null);

  return (
    <div className="card">
      <div className="progress-card-head">
        <h2>{VIEWS[view]}</h2>
        <button
          type="button"
          className="view-flip"
          onClick={() => {
            setFlipped(true);
            setView((v) => 1 - v);
          }}
          aria-label={view === 0 ? "Show daily progress" : "Show weekly totals"}
        >
          {/* Up / down arrows */}
          <svg className={`icon${view === 1 ? " turned" : ""}`} viewBox="0 0 24 24">
            <path d="M7 20V4"></path>
            <polyline points="3 8 7 4 11 8"></polyline>
            <path d="M17 4v16"></path>
            <polyline points="13 16 17 20 21 16"></polyline>
          </svg>
        </button>
      </div>

      {/* Fixed height so the card doesn't resize when the view changes. */}
      <div className="progress-body">
      <div
        key={view}
        className={`progress-view${flipped ? (view === 1 ? " enter-up" : " enter-down") : ""}`}
      >
      {view === 0 ? (
        <BarChart weeks={weeks} showBreak={showBreak} />
      ) : (
        <div className="month-cal">
          <div className="month-nav">
            <button type="button" className="icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">
              <ChevronIcon dir="left" />
            </button>
            <span className="month-label">
              {monthLabel}
            </span>
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                if (!isCurrentMonth) shiftMonth(1);
              }}
              // aria-disabled, not disabled: a clicked button that turns
              // disabled drops keyboard focus, which breaks arrow-key scrolling.
              aria-disabled={isCurrentMonth}
              aria-label="Next month"
            >
              <ChevronIcon dir="right" />
            </button>
          </div>

          <div className="cal-grid">
            {WEEKDAYS.map((d, i) => (
              <span className="cal-weekday" key={i}>
                {d}
              </span>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <span key={`pad-${i}`} />;
              const studySeconds = studyDays.get(day) ?? 0;
              const studied = studySeconds > 0;
              const isToday = isCurrentMonth && day === today.getDate();
              const isFuture = isCurrentMonth && day > today.getDate();
              const col = i % 7;
              const tip = `${new Date(cursor.year, cursor.month, day).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })} · ${studied ? fmtMin(studySeconds) : isFuture ? "Upcoming" : "No study"}`;
              return (
                <span
                  key={day}
                  tabIndex={0}
                  className={`cal-day${studied ? " studied" : ""}${isToday ? " today" : ""}${isFuture ? " future" : ""}${
                    col <= 1 ? " tip-left" : col >= 5 ? " tip-right" : ""
                  }`}
                  aria-label={tip}
                >
                  <b>{day}</b>
                  {studied && (
                    <svg className="icon cal-tick" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                  <span className="cal-tip" role="tooltip">
                    {tip}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}
      </div>
      </div>
    </div>
  );
}
