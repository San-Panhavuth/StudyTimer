import { getSessions, getSubjects } from "@/lib/data/fetch";
import LogClient from "./log-client";

export default async function LogPage() {
  const [subjects, sessions] = await Promise.all([getSubjects(), getSessions()]);

  return (
    <section className="panel">
      <LogClient subjects={subjects} sessions={sessions} />
    </section>
  );
}
