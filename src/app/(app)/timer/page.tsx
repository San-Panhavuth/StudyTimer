import TimerClient from "./timer-client";

// No data fetching here on purpose: subjects, the active session and the
// photo requirement come from the (app) layout via ActiveSessionProvider, so
// switching back to this tab renders instantly instead of re-fetching.
// (Parent accounts are redirected away client-side in TimerClient.)
export default function TimerPage() {
  return (
    <section className="panel">
      <div className="timer-stage">
        <TimerClient />
      </div>
    </section>
  );
}
