import { getSessions } from "@/lib/data/fetch";
import LogClient from "./log-client";

export default async function LogPage() {
  const sessions = await getSessions();

  return (
    <section className="panel">
      <LogClient sessions={sessions} />
    </section>
  );
}
