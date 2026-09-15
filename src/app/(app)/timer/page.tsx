import { redirect } from "next/navigation";
import { getProfile, getSubjects } from "@/lib/data/fetch";
import TimerClient from "./timer-client";

export default async function TimerPage() {
  const profile = await getProfile();
  if (profile?.role === "parent") redirect("/children");

  const subjects = await getSubjects();

  return (
    <section className="panel">
      <div className="timer-stage">
        <TimerClient initialSubjects={subjects} />
      </div>
    </section>
  );
}
