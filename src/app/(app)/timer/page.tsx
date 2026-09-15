import { redirect } from "next/navigation";
import { getActiveSession, getProfile, getSubjects } from "@/lib/data/fetch";
import TimerClient from "./timer-client";

export default async function TimerPage() {
  const profile = await getProfile();
  if (profile?.role === "parent") redirect("/children");

  const [subjects, activeSession] = await Promise.all([getSubjects(), getActiveSession()]);

  return (
    <section className="panel">
      <div className="timer-stage">
        <TimerClient initialSubjects={subjects} initialActiveSession={activeSession} />
      </div>
    </section>
  );
}
