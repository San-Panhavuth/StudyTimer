"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import Sheet from "@/components/sheet";
import { useChildSelection } from "@/components/child-selection";
import { goToTab } from "@/components/tab-pager";
import { colorForSubject, fmtMin } from "@/lib/format";
import { removeChildLinkAction, setChildPhotoRequirementAction } from "../actions";
import type { LinkedChild, RecentChildSession } from "@/lib/data/types";

// Start of the viewer's local day. Read through useSyncExternalStore so the
// server render (which doesn't know the parent's timezone) shows a
// placeholder and the client fills in the real number without a hydration
// mismatch.
function getDayStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
const subscribeNone = () => () => {};

export default function ChildrenList({
  initialChildren,
  recentSessions,
}: {
  initialChildren: LinkedChild[];
  recentSessions: RecentChildSession[];
}) {
  const [children, setChildren] = useState(initialChildren);
  const [removeTarget, setRemoveTarget] = useState<LinkedChild | null>(null);
  // Card ids currently flipped to their settings side, and which have been
  // flipped at least once (so the first render doesn't animate).
  const [settingsOpen, setSettingsOpen] = useState<Set<string>>(new Set());
  const [everFlipped, setEverFlipped] = useState<Set<string>>(new Set());
  const { requestChild } = useChildSelection();
  const dayStart = useSyncExternalStore(subscribeNone, getDayStart, () => null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirmRemove() {
    const target = removeTarget;
    if (!target) return;
    setRemoveTarget(null);
    startTransition(async () => {
      try {
        await removeChildLinkAction(target.linkId);
        setChildren((prev) => prev.filter((c) => c.linkId !== target.linkId));
      } catch {
        setError("Couldn't remove that child.");
      }
    });
  }

  function flip(id: string) {
    setEverFlipped((prev) => new Set(prev).add(id));
    setSettingsOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Tapping a child's card (not its buttons) opens their log. Only on the
  // overview side; the settings side is just controls.
  function openChildLog(e: React.MouseEvent, c: LinkedChild) {
    if (settingsOpen.has(c.childId)) return;
    if ((e.target as HTMLElement).closest("button")) return;
    requestChild(c.childId);
    goToTab("/children-log");
  }

  function togglePhotos(c: LinkedChild) {
    const next = !c.requirePhotos;
    setError(null);
    // Optimistic; rolled back if the save fails.
    setChildren((prev) => prev.map((x) => (x.linkId === c.linkId ? { ...x, requirePhotos: next } : x)));
    startTransition(async () => {
      try {
        await setChildPhotoRequirementAction(c.linkId, next);
      } catch {
        setChildren((prev) => prev.map((x) => (x.linkId === c.linkId ? { ...x, requirePhotos: !next } : x)));
        setError("Couldn't update that setting.");
      }
    });
  }

  if (children.length === 0) {
    return <div className="empty-note">No children linked yet. Tap the + button below to add one.</div>;
  }

  return (
    <>
      {error && (
        <div className="auth-error" style={{ width: "100%" }}>
          {error}
        </div>
      )}
      <div className="session-list">
        {children.map((c) => {
          const inSettings = settingsOpen.has(c.childId);
          const todays =
            dayStart === null ? null : recentSessions.filter((s) => s.childId === c.childId && s.startTs >= dayStart);
          const todaySeconds = todays ? todays.reduce((sum, s) => sum + s.studySeconds, 0) : 0;
          // Most recent session with study time today, for the "latest subject".
          const latest = todays
            ? todays.filter((s) => s.studySeconds > 0).reduce<RecentChildSession | null>(
                (best, s) => (!best || s.startTs > best.startTs ? s : best),
                null,
              )
            : null;

          return (
            <div
              className="session-card child-card"
              key={c.linkId}
              role={inSettings ? undefined : "link"}
              tabIndex={inSettings ? undefined : 0}
              onClick={(e) => openChildLog(e, c)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.target === e.currentTarget) openChildLog(e as unknown as React.MouseEvent, c);
              }}
            >
              <div className="child-head">
                <span className="child-email">{c.childEmail}</span>
                <button
                  type="button"
                  className="view-flip"
                  onClick={() => flip(c.childId)}
                  aria-label={inSettings ? "Show study summary" : "Show settings"}
                >
                  <svg className={`icon${inSettings ? " turned" : ""}`} viewBox="0 0 24 24">
                    <path d="M7 20V4"></path>
                    <polyline points="3 8 7 4 11 8"></polyline>
                    <path d="M17 4v16"></path>
                    <polyline points="13 16 17 20 21 16"></polyline>
                  </svg>
                </button>
              </div>

              {/* Fixed height so the card doesn't resize when flipped. */}
              <div className="child-body">
                <div
                  key={inSettings ? "settings" : "overview"}
                  className={`progress-view${
                    everFlipped.has(c.childId) ? (inSettings ? " enter-up" : " enter-down") : ""
                  }`}
                >
                  {inSettings ? (
                    <div className="child-settings">
                      <div className="child-setting-row">
                        <span className="field-label">Require photos</span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={c.requirePhotos}
                          aria-label="Require photos"
                          className={`seg-switch${c.requirePhotos ? " on" : ""}`}
                          onClick={() => togglePhotos(c)}
                        >
                          <span className="seg-thumb"></span>
                          <span className="seg-opt">Off</span>
                          <span className="seg-opt">On</span>
                        </button>
                      </div>
                      <button type="button" className="child-remove" onClick={() => setRemoveTarget(c)}>
                        <svg className="icon" viewBox="0 0 24 24">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                          <path d="M10 11v6"></path>
                          <path d="M14 11v6"></path>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
                        </svg>
                        Remove child
                      </button>
                    </div>
                  ) : (
                    <div className="child-today">
                      <span className="child-today-label">Studied today</span>
                      <span className="child-today-main">
                        {todays === null ? (
                          <span className="child-today-value none">&nbsp;</span>
                        ) : todaySeconds > 0 ? (
                          <>
                            <span className="child-today-value">{fmtMin(todaySeconds)}</span>
                            {latest && (
                              <span className="child-today-latest">
                                <span className="child-today-latest-label">Latest subject</span>
                                <span className="child-today-latest-name">
                                  <i style={{ background: colorForSubject(latest.subject) }}></i>
                                  {latest.subject}
                                </span>
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="child-today-value none">Not yet</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove child?">
        <p>
          Remove <b>{removeTarget?.childEmail}</b>? You&apos;ll stop seeing their study log until you add them again.
        </p>
        <button className="btn btn-stop" onClick={confirmRemove} disabled={pending}>
          Yes, remove
        </button>
        <button className="sheet-close" onClick={() => setRemoveTarget(null)}>
          Cancel
        </button>
      </Sheet>
    </>
  );
}
