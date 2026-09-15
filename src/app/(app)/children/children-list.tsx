"use client";

import { useState, useTransition } from "react";
import Sheet from "@/components/sheet";
import { removeChildLinkAction } from "../actions";
import type { LinkedChild } from "@/lib/data/types";

export default function ChildrenList({ initialChildren }: { initialChildren: LinkedChild[] }) {
  const [children, setChildren] = useState(initialChildren);
  const [removeTarget, setRemoveTarget] = useState<LinkedChild | null>(null);
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
        {children.map((c) => (
          <div className="session-card" key={c.linkId}>
            <div className="child-row">
              <span className="session-subject">{c.childEmail}</span>
              <button
                type="button"
                className="icon-btn danger"
                onClick={() => setRemoveTarget(c)}
                aria-label="Remove child"
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
        ))}
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
