import { redirect } from "next/navigation";
import { getLinkedChildren, getProfile } from "@/lib/data/fetch";
import ChildrenList from "./children-list";

export default async function ChildrenPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "parent") redirect("/timer");

  const children = await getLinkedChildren();

  return (
    <section className="panel">
      <div className="card children-card">
        <h2>Children</h2>
        <ChildrenList initialChildren={children} />
      </div>
    </section>
  );
}
