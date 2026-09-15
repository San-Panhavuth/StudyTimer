"use client";

import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { ActiveSession } from "@/lib/data/types";

type ActiveSessionContextValue = {
  active: ActiveSession | null;
  setActive: Dispatch<SetStateAction<ActiveSession | null>>;
  now: number;
};

const ActiveSessionContext = createContext<ActiveSessionContextValue | null>(null);

// Lives at the (app) layout level (not the Timer page) so the running
// timer's state and ticking interval survive navigating to other tabs —
// previously it lived inside TimerClient, which unmounted (and stopped
// ticking) the moment you left the Timer page, making it look like the
// timer itself had stopped even though the underlying session was fine.
export function ActiveSessionProvider({
  initialActiveSession,
  serverNow,
  children,
}: {
  initialActiveSession: ActiveSession | null;
  serverNow: number;
  children: ReactNode;
}) {
  const [active, setActive] = useState(initialActiveSession);
  // Seeded with the server's Date.now() (same number on server render and
  // first client paint — no hydration mismatch), then corrected to the
  // real client clock right after mount.
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  return <ActiveSessionContext.Provider value={{ active, setActive, now }}>{children}</ActiveSessionContext.Provider>;
}

export function useActiveSession() {
  const ctx = useContext(ActiveSessionContext);
  if (!ctx) throw new Error("useActiveSession must be used within ActiveSessionProvider");
  return ctx;
}
