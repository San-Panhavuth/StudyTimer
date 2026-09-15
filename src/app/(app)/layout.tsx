import { redirect } from "next/navigation";
import { getActiveSession, getProfile } from "@/lib/data/fetch";
import ProfileMenu from "@/components/profile-menu";
import BottomNav from "@/components/bottom-nav";
import { ActiveSessionProvider } from "@/components/active-session-provider";
import StudyingBadge from "@/components/studying-badge";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const activeSession = profile.role === "child" ? await getActiveSession() : null;

  return (
    <ActiveSessionProvider initialActiveSession={activeSession} serverNow={Date.now()}>
      <div className="app-shell">
        <header className="top-bar">
          <div className="wordmark">
            <span className="khmer">វេលារៀន</span>
            <span className="latin">Velea Rien</span>
          </div>
          <ProfileMenu displayName={profile.email || profile.displayName} role={profile.role} childCode={profile.childCode} />
        </header>

        <div className="krama-rule"></div>

        <main className="content">
          <StudyingBadge />
          {children}
        </main>

        <BottomNav role={profile.role} />
      </div>
    </ActiveSessionProvider>
  );
}
