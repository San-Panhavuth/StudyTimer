import { redirect } from "next/navigation";
import { getPendingLinkRequests, getProfile } from "@/lib/data/fetch";
import ProfileMenu from "@/components/profile-menu";
import BottomNav from "@/components/bottom-nav";
import PendingLinkBanner from "@/components/pending-link-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const pendingRequests = profile.role === "child" ? await getPendingLinkRequests() : [];

  return (
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
        {pendingRequests.length > 0 && <PendingLinkBanner initialRequests={pendingRequests} />}
        {children}
      </main>

      <BottomNav role={profile.role} />
    </div>
  );
}
