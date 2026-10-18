"use client";

import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { ActiveSession, Subject } from "@/lib/data/types";

type ActiveSessionContextValue = {
  active: ActiveSession | null;
  setActive: Dispatch<SetStateAction<ActiveSession | null>>;
  now: number;
  // null for parent accounts (they have no timer).
  subjects: Subject[] | null;
  setSubjects: Dispatch<SetStateAction<Subject[]>>;
  requirePhotos: boolean;
};

const ActiveSessionContext = createContext<ActiveSessionContextValue | null>(null);

// Lives at the (app) layout level (not the Timer page) so the running
// timer's state and ticking interval survive navigating to other tabs —
// previously it lived inside TimerClient, which unmounted (and stopped
// ticking) the moment you left the Timer page, making it look like the
// timer itself had stopped even though the underlying session was fine.
//
// Subjects and the photo requirement are held here for the same reason:
// the layout fetches them once, so switching tabs doesn't refetch them and
// the Timer card renders instantly instead of flashing a loading skeleton.
export function ActiveSessionProvider({
  initialActiveSession,
  initialSubjects,
  requirePhotos,
  serverNow,
  children,
}: {
  initialActiveSession: ActiveSession | null;
  initialSubjects: Subject[] | null;
  requirePhotos: boolean;
  serverNow: number;
  children: ReactNode;
}) {
  const [active, setActive] = useState(initialActiveSession);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects ?? []);
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

  return (
    <ActiveSessionContext.Provider
      value={{
        active,
        setActive,
        now,
        subjects: initialSubjects === null ? null : subjects,
        setSubjects,
        requirePhotos,
      }}
    >
      {children}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  const ctx = useContext(ActiveSessionContext);
  if (!ctx) throw new Error("useActiveSession must be used within ActiveSessionProvider");
  return ctx;
}
