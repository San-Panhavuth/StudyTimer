"use client";

import { useRef, useState } from "react";

const CLOSE_THRESHOLD_PX = 70;

export default function Sheet({
  open,
  onClose,
  title,
  headerActions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startYRef = useRef(0);

  function handlePointerDown(e: React.PointerEvent) {
    startYRef.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDragY(Math.max(0, e.clientY - startYRef.current));
  }

  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);
    const shouldClose = dragY > CLOSE_THRESHOLD_PX;
    setDragY(0);
    if (shouldClose) onClose();
  }

  return (
    <div
      className={`sheet-overlay${open ? " open" : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`sheet${dragging ? " dragging" : ""}`}
        style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
      >
        <div
          className="sheet-handle-area"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="sheet-handle"></div>
        </div>
        {(title || headerActions) && (
          <div className="sheet-header">
            {title && <h3>{title}</h3>}
            {headerActions && <div className="sheet-header-actions">{headerActions}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
