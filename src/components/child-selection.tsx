"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// Lets the Children tab ask the Children Log tab to show a particular child.
// The nonce makes asking for the same child twice in a row still count as a
// new request (e.g. after the user switched the log to someone else).
type Request = { id: string | null; nonce: number };

type ChildSelectionValue = {
  requested: Request;
  requestChild: (childId: string) => void;
};

const ChildSelectionContext = createContext<ChildSelectionValue | null>(null);

export function ChildSelectionProvider({ children }: { children: ReactNode }) {
  const [requested, setRequested] = useState<Request>({ id: null, nonce: 0 });
  const requestChild = useCallback((id: string) => setRequested((r) => ({ id, nonce: r.nonce + 1 })), []);
  const value = useMemo(() => ({ requested, requestChild }), [requested, requestChild]);
  return <ChildSelectionContext.Provider value={value}>{children}</ChildSelectionContext.Provider>;
}

export function useChildSelection() {
  const ctx = useContext(ChildSelectionContext);
  if (!ctx) throw new Error("useChildSelection must be used within ChildSelectionProvider");
  return ctx;
}
