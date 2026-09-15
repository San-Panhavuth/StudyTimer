import { redirect } from "next/navigation";
import { getProfile, getSessions } from "@/lib/data/fetch";
import LogClient from "./log-client";

export default async function LogPage() {
  const profile = await getProfile();
  if (profile?.role === "parent") redirect("/children");

  const sessions = await getSessions();

  return (
    <section className="panel">
      <LogClient sessions={sessions} />
    </section>
  );
}
