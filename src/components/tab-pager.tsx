"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

const LOCK_PX = 8; // movement before we decide horizontal vs. vertical
const SNAP_FRACTION = 0.2; // drag past this share of the width to switch
const FLICK_PX_PER_MS = 0.5; // ...or release faster than this
const EDGE_RESISTANCE = 0.3; // dragging past the first/last page

// Switch tabs without a server round trip: only the URL changes (Next syncs
// usePathname with history.pushState), and the pager below animates.
export function goToTab(path: string) {
  if (window.location.pathname !== path) window.history.pushState(null, "", path);
}

type Gesture = { x: number; y: number; t: number; lock: "h" | "v" | null; lastX: number; lastT: number };

// Both tabs are mounted side by side in one track; the active one is
// whichever path matches the URL. Swiping drags the whole track, so the pages
// move, not just their contents. Tapping a tab runs the same slide.
export default function TabPager({
  paths,
  panels,
  refreshOnEnter,
}: {
  paths: [string, string];
  panels: [ReactNode, ReactNode];
  // Re-fetch server data (in the background, no loading state) whenever this
  // page index is switched to, since both pages are mounted all the time.
  refreshOnEnter?: 0 | 1;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const index = pathname === paths[1] ? 1 : 0;

  const [dragX, setDragX] = useState<number | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const firstRender = useRef(true);
  const pagerRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);

  // The pager is exactly the visible area between the header and the bottom
  // nav, and each page scrolls inside its own panel. That way every page
  // keeps its own scroll position, and the page beside it never inherits (or
  // disturbs) the window's scroll offset.
  useLayoutEffect(() => {
    const el = pagerRef.current;
    if (!el) return;
    const update = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const nav = document.querySelector<HTMLElement>(".bottom-nav");
      const navH = nav ? nav.offsetHeight : 64;
      el.style.setProperty("--pager-h", `${Math.max(0, window.innerHeight - top - navH)}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(document.body);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // The pages scroll inside their own panels, which only cover the app column.
  // On a wide screen the mouse is often over the empty margins, where a wheel
  // would do nothing, so forward wheel scrolling from anywhere to the page
  // that's showing. (Open sheets and anything that can scroll itself keep
  // their own wheel behaviour.)
  useEffect(() => {
    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || e.defaultPrevented || e.deltaY === 0) return;
      const target = e.target as Element | null;
      if (!target || target.closest(".sheet-overlay, .pager-panel")) return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      panelRefs.current[index]?.scrollBy({ top: e.deltaY * unit });
    }
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [index]);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    // Keep keyboard scrolling (arrows / space / PageUp) working on the page
    // we just switched to.
    panelRefs.current[index]?.focus({ preventScroll: true });
    if (refreshOnEnter === index) router.refresh();
  }, [index, refreshOnEnter, router]);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse") return; // touch / pen only
    const target = e.target as HTMLElement;
    // Don't hijack inputs, open sheets, or things that scroll sideways.
    if (target.closest(".sheet-overlay, [data-no-swipe], input, textarea, select")) return;
    gesture.current = { x: e.clientX, y: e.clientY, t: e.timeStamp, lock: null, lastX: e.clientX, lastT: e.timeStamp };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g) return;
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;

    if (g.lock === null) {
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
      g.lock = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      if (g.lock === "h") e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (g.lock !== "h") return;

    g.lastX = e.clientX;
    g.lastT = e.timeStamp;
    const pastEdge = (index === 0 && dx > 0) || (index === 1 && dx < 0);
    setDragX(pastEdge ? dx * EDGE_RESISTANCE : dx);
  }

  function handlePointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.lock !== "h") return;

    const dx = e.clientX - g.x;
    const width = e.currentTarget.clientWidth;
    const dt = Math.max(1, e.timeStamp - g.lastT);
    const velocity = (e.clientX - g.lastX) / dt;

    const goNext = index === 0 && (dx < -width * SNAP_FRACTION || velocity < -FLICK_PX_PER_MS);
    const goPrev = index === 1 && (dx > width * SNAP_FRACTION || velocity > FLICK_PX_PER_MS);

    setDragX(null);
    if (goNext) goToTab(paths[1]);
    else if (goPrev) goToTab(paths[0]);
  }

  const dragging = dragX !== null;

  return (
    <div
      ref={pagerRef}
      className="pager"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      <div
        className="pager-track"
        style={{
          marginLeft: dragging ? `calc(${-index * 100}% + ${dragX}px)` : `${-index * 100}%`,
          transition: dragging ? "none" : undefined,
        }}
      >
        {panels.map((panel, i) => (
          <div
            key={paths[i]}
            ref={(el) => {
              panelRefs.current[i] = el;
            }}
            tabIndex={-1}
            className="pager-panel"
            inert={i !== index}
            aria-hidden={i !== index}
          >
            {panel}
          </div>
        ))}
      </div>
    </div>
  );
}
