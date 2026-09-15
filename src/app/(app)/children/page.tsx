import { redirect } from "next/navigation";
import { getLinkedChildren, getProfile } from "@/lib/data/fetch";

export default async function ChildrenPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "parent") redirect("/timer");

  const children = await getLinkedChildren();

  return (
    <section className="panel">
      <div className="card">
        <h2>Children</h2>
        {children.length === 0 ? (
          <div className="empty-note">No children linked yet. Tap the + button below to add one.</div>
        ) : (
          <div className="session-list">
            {children.map((c) => (
              <div className="session-card" key={c.linkId}>
                <div className="session-top">
                  <span className="session-subject">{c.childDisplayName}</span>
                  <span
                    className={`status-pill shown${c.status === "approved" ? " live" : c.status === "rejected" ? "" : " on-break"}`}
                  >
                    {c.status === "pending" ? "Pending" : c.status === "approved" ? "Linked" : "Rejected"}
                  </span>
                </div>
                <div className="session-meta">
                  <span className="stat-label">{c.childEmail}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
