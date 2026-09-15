"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveSession } from "./active-session-provider";
import { fmtHMS } from "@/lib/format";

// Shown on every tab except Timer itself (which already renders the full
// countdown), so the running session never looks like it "stopped" just
// because you navigated away from the Timer page.
export default function StudyingBadge() {
  const { active, now } = useActiveSession();
  const pathname = usePathname();

  if (!active || pathname === "/timer") return null;

  const onBreak = active.status === "break";
  const totalBreakSec = active.breakIntervals.reduce((sum, b) => sum + (b.end - b.start) / 1000, 0);
  const ongoing = onBreak && active.breakStart ? (now - active.breakStart) / 1000 : 0;
  const breakSec = totalBreakSec + ongoing;
  const studySec = Math.max(0, (now - active.startTs) / 1000 - breakSec);

  return (
    <Link href="/timer" className={`studying-badge${onBreak ? " on-break" : ""}`}>
      <span className="dot"></span>
      {onBreak ? "On Break" : `Studying ${active.subject}`} · {fmtHMS(onBreak ? breakSec : studySec)}
    </Link>
  );
}
