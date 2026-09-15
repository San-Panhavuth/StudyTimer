"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Sheet from "@/components/sheet";
import { fmtHMS, fmtMin } from "@/lib/format";
import type { ActiveSession, Subject } from "@/lib/data/types";
import {
  addSubjectAction,
  deleteSubjectAction,
  renameSubjectAction,
  startSessionAction,
  stopSessionAction,
  toggleBreakAction,
} from "../actions";

export default function TimerClient({
  initialSubjects,
  initialActiveSession,
}: {
  initialSubjects: Subject[];
  initialActiveSession: ActiveSession | null;
}) {
  const [subjects, setSubjects] = useState(initialSubjects);
  const [active, setActive] = useState(initialActiveSession);
  const [now, setNow] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editSubjectName, setEditSubjectName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  let studySec = 0;
  let breakSec = 0;
  if (active && now !== null) {
    const totalBreakSec = active.breakIntervals.reduce((sum, b) => sum + (b.end - b.start) / 1000, 0);
    const ongoing = active.status === "break" && active.breakStart ? (now - active.breakStart) / 1000 : 0;
    breakSec = totalBreakSec + ongoing;
    studySec = Math.max(0, (now - active.startTs) / 1000 - breakSec);
  }
  const onBreak = active?.status === "break";

  function pickSubject(subjectId: string, subjectName: string) {
    setPickerOpen(false);
    setError(null);
    startTransition(async () => {
      try {
        const session = await startSessionAction(subjectId, subjectName);
        setNow(Date.now());
        setActive(session);
      } catch {
        setError("Couldn't start the timer. Try again.");
      }
    });
  }

  function handleAddSubject() {
    const name = newSubjectName.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        const subject = await addSubjectAction(name);
        setSubjects((prev) => (prev.some((s) => s.id === subject.id) ? prev : [...prev, subject]));
        setNewSubjectName("");
        setAddOpen(false);
      } catch {
        setError("Couldn't add that subject.");
      }
    });
  }

  function startEdit(s: Subject) {
    setEditingSubjectId(s.id);
    setEditSubjectName(s.name);
  }

  function cancelEdit() {
    setEditingSubjectId(null);
    setEditSubjectName("");
  }

  function saveEdit() {
    const id = editingSubjectId;
    const name = editSubjectName.trim();
    if (!id || !name) {
      cancelEdit();
      return;
    }
    startTransition(async () => {
      try {
        const updated = await renameSubjectAction(id, name);
        setSubjects((prev) => prev.map((s) => (s.id === id ? updated : s)));
        setActive((prev) => (prev && prev.subjectId === id ? { ...prev, subject: updated.name } : prev));
        cancelEdit();
      } catch {
        setError("Couldn't rename that subject.");
      }
    });
  }

  function confirmDeleteSubject() {
    const target = deleteTarget;
    if (!target) return;
    setDeleteTarget(null);
    startTransition(async () => {
      try {
        await deleteSubjectAction(target.id);
        setSubjects((prev) => prev.filter((s) => s.id !== target.id));
        setActive((prev) => (prev && prev.subjectId === target.id ? null : prev));
      } catch {
        setError("Couldn't delete that subject.");
      }
    });
  }

  function handleBreakToggle() {
    setError(null);
    startTransition(async () => {
      try {
        const session = await toggleBreakAction();
        setNow(Date.now());
        setActive(session);
      } catch {
        setError("Couldn't update the break. Try again.");
      }
    });
  }

  function handleConfirmStop() {
    setConfirmOpen(false);
    startTransition(async () => {
      try {
        await stopSessionAction();
        setActive(null);
      } catch {
        setError("Couldn't save that session. Try again.");
      }
    });
  }

  return (
    <div className={`card timer-card${onBreak ? " on-break" : ""}`}>
      <div className={`status-pill${active ? " shown" : ""} ${onBreak ? "on-break" : active ? "live" : ""}`}>
        <span className="dot"></span>
        {onBreak ? "On Break" : active ? "Studying" : "Idle"}
      </div>


      <div className="subject-name">{active ? active.subject : " "}</div>
      <div className="big-time">{fmtHMS(onBreak ? breakSec : studySec)}</div>

      <div className={`sub-times${active ? " shown" : ""}`}>
        <span>
          Study <b>{fmtMin(studySec)}</b>
        </span>
        <span>
          Break <b>{fmtMin(breakSec)}</b>
        </span>
      </div>

      {error && <div className="auth-error" style={{ width: "100%" }}>{error}</div>}

      {!active ? (
        <div style={{ width: "100%" }}>
          <button className="btn btn-primary" type="button" onClick={() => setPickerOpen(true)} disabled={pending}>
            <svg className="icon" viewBox="0 0 24 24">
              <polygon points="6 3 20 12 6 21 6 3"></polygon>
            </svg>
            Start Timer
          </button>
        </div>
      ) : (
        <div className="btn-row">
          <button className="btn btn-break" onClick={handleBreakToggle} disabled={pending}>
            {onBreak ? (
              <svg className="icon" viewBox="0 0 24 24">
                <polygon points="6 3 20 12 6 21 6 3"></polygon>
              </svg>
            ) : (
              <svg className="icon" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
            )}
            {onBreak ? "Study" : "Break"}
          </button>
          <button className="btn btn-stop" onClick={() => setConfirmOpen(true)} disabled={pending}>
            <svg className="icon" viewBox="0 0 24 24">
              <rect x="5" y="5" width="14" height="14" rx="2"></rect>
            </svg>
            Stop
          </button>
        </div>
      )}

      <Sheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Pick a subject"
        headerActions={
          <button type="button" className="sheet-header-btn primary" onClick={() => setAddOpen(true)}>
            Add
          </button>
        }
      >
        <div className="sheet-list">
          {subjects.map((s) =>
            editingSubjectId === s.id ? (
              <div key={s.id} className="sheet-row sheet-row-editing">
                <input
                  className="sheet-row-edit-input"
                  value={editSubjectName}
                  onChange={(e) => setEditSubjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  autoFocus
                />
                <div className="sheet-row-actions">
                  <button type="button" className="icon-btn" onClick={saveEdit} disabled={pending} aria-label="Save name">
                    <svg className="icon" viewBox="0 0 24 24">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                  <button type="button" className="icon-btn" onClick={cancelEdit} aria-label="Cancel edit">
                    <svg className="icon" viewBox="0 0 24 24">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div key={s.id} className="sheet-row">
                <button type="button" className="sheet-row-main" onClick={() => pickSubject(s.id, s.name)}>
                  <span>{s.name}</span>
                </button>
                <div className="sheet-row-actions">
                  <button type="button" className="icon-btn" onClick={() => startEdit(s)} aria-label="Rename subject">
                    <svg className="icon" viewBox="0 0 24 24">
                      <path d="M12 20h9"></path>
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    onClick={() => setDeleteTarget(s)}
                    aria-label="Delete subject"
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
              </div>
            ),
          )}
        </div>
      </Sheet>

      <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add subject">
        <div className="sheet-add">
          <input
            ref={addInputRef}
            type="text"
            placeholder="Add new subject..."
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddSubject();
            }}
            autoFocus
          />
          <button onClick={handleAddSubject} disabled={pending}>
            Add
          </button>
        </div>
        <button className="sheet-close" onClick={() => setAddOpen(false)}>
          Cancel
        </button>
      </Sheet>

      <Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)} title="End this session?">
        <p>Are you sure you&apos;re done for this session? No more studying?</p>
        <button className="btn btn-stop" onClick={handleConfirmStop} disabled={pending}>
          Yes, I&apos;m done
        </button>
        <button className="sheet-close" onClick={() => setConfirmOpen(false)}>
          Keep studying
        </button>
      </Sheet>

      <Sheet open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete subject?">
        <p>
          Delete <b>{deleteTarget?.name}</b>? This also erases every logged session for it — it won&apos;t show up
          in your charts anymore.
        </p>
        <button className="btn btn-stop" onClick={confirmDeleteSubject} disabled={pending}>
          Yes, delete it
        </button>
        <button className="sheet-close" onClick={() => setDeleteTarget(null)}>
          Cancel
        </button>
      </Sheet>
    </div>
  );
}
