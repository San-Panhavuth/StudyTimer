"use client";

import { useState } from "react";
import PieChart from "@/components/pie-chart";
import { fmtMin } from "@/lib/format";
import type { PieEntry } from "@/lib/log-calculations";

const VIEWS = ["Time by Subject", "Subject Ranking"] as const;

// "Time by Subject" card with two views of the same data: the pie chart and a
// ranked bar list (longest study time on top). Both share the subject filter,
// and the include-break chip sits under either view.
export default function SubjectCard({
  entries,
  selectedSubjects,
  onToggleLabel,
  onClearSubjects,
  includeBreakOn,
  onToggleBreak,
}: {
  // Every subject with time in the date range (the legend lists all of them).
  entries: PieEntry[];
  // Empty = All. Otherwise the charts show only these subjects.
  selectedSubjects: string[];
  onToggleLabel: (label: string) => void;
  onClearSubjects: () => void;
  includeBreakOn: boolean;
  onToggleBreak: () => void;
}) {
  const [view, setView] = useState(0);
  // No enter animation on first render, only after the user flips the card.
  const [flipped, setFlipped] = useState(false);

  const filtering = selectedSubjects.length > 0;
  // The charts show only the selected subjects (Break always follows its own
  // toggle). Sorted again so the ranking never depends on caller order.
  const visible = entries.filter((e) => !filtering || e.label === "Break" || selectedSubjects.includes(e.label));
  const ranked = [...visible].sort((a, b) => b.minutes - a.minutes);
  const max = Math.max(1, ...ranked.map((e) => e.minutes));

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
          aria-label={view === 0 ? "Show subject ranking" : "Show pie chart"}
        >
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
            <PieChart entries={visible} selectedSubjects={[]} onToggleLabel={onToggleLabel} />
          ) : ranked.length === 0 ? (
            <div className="empty-note">No study time in this range yet.</div>
          ) : (
            <div className="rank-list">
              {ranked.map((e) => {
                return (
                  <button
                    type="button"
                    key={e.label}
                    className="rank-row"
                    onClick={() => onToggleLabel(e.label)}
                  >
                    <span className="rank-track">
                      <span
                        className="rank-bar"
                        style={{ width: `${(e.minutes / max) * 100}%`, background: e.color }}
                      >
                        {e.label}
                      </span>
                    </span>
                    <span className="rank-value">{fmtMin(e.minutes * 60)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {entries.length > 0 && (
        <div className="subject-legend">
          <button type="button" className={`legend-item${filtering ? "" : " on"}`} onClick={onClearSubjects}>
            <span className={`legend-swatch legend-check${filtering ? "" : " checked"}`}>
              {!filtering && (
                <svg className="icon legend-tick" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
              )}
            </span>
            All
          </button>
          {/* Break isn't a subject; it has its own chip below. */}
          {entries
            .filter((e) => e.label !== "Break")
            .map((e) => {
            const selected = filtering && (e.label === "Break" || selectedSubjects.includes(e.label));
            const dimmed = filtering && !selected;
            return (
              <button
                type="button"
                key={e.label}
                className={`legend-item${dimmed ? " dimmed" : ""}`}
                onClick={() => onToggleLabel(e.label)}
              >
                <span className="legend-swatch" style={{ background: e.color }}>
                  {selected && (
                    <svg className="icon legend-tick" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </span>
                {e.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="chip-row">
        <button type="button" className={`chip-toggle${includeBreakOn ? " on" : ""}`} onClick={onToggleBreak}>
          {includeBreakOn ? "✓ Break included" : "+ Include break"}
        </button>
      </div>
    </div>
  );
}
