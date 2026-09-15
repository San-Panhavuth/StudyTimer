"use client";

import { useState, useTransition } from "react";
import { respondToLinkRequestAction } from "@/app/(app)/actions";
import type { PendingLinkRequest } from "@/lib/data/types";

export default function PendingLinkBanner({ initialRequests }: { initialRequests: PendingLinkRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [pending, startTransition] = useTransition();

  function respond(linkId: string, approve: boolean) {
    startTransition(async () => {
      try {
        await respondToLinkRequestAction(linkId, approve);
        setRequests((prev) => prev.filter((r) => r.linkId !== linkId));
      } catch {
        // leave it in the list so the user can retry
      }
    });
  }

  if (requests.length === 0) return null;

  return (
    <div className="link-banner-stack">
      {requests.map((r) => (
        <div key={r.linkId} className="link-banner">
          <p>
            <b>{r.parentEmail}</b> wants to link as your parent, to see your study log.
          </p>
          <div className="btn-row">
            <button className="btn btn-primary" disabled={pending} onClick={() => respond(r.linkId, true)}>
              Approve
            </button>
            <button className="btn btn-ghost" disabled={pending} onClick={() => respond(r.linkId, false)}>
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
