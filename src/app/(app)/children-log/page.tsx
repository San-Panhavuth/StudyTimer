import { redirect } from "next/navigation";
import { getChildSessions, getLinkedChildren, getProfile } from "@/lib/data/fetch";
import ChildrenLogClient from "./children-log-client";

export default async function ChildrenLogPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "parent") redirect("/timer");

  const allLinks = await getLinkedChildren();
  const approved = allLinks.filter((c) => c.status === "approved");
  const initialChildId = approved[0]?.childId ?? null;
  const initialSessions = initialChildId ? await getChildSessions(initialChildId) : [];

  return (
    <section className="panel">
      <ChildrenLogClient linkedChildren={approved} initialChildId={initialChildId} initialSessions={initialSessions} />
    </section>
  );
}
