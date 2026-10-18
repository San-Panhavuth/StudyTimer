import { redirect } from "next/navigation";
import {
  getActiveSession,
  getChildSessions,
  getLinkedChildren,
  getPhotoRequirement,
  getRecentChildSessions,
  getProfile,
  getSessions,
  getSubjects,
} from "@/lib/data/fetch";
import ProfileMenu from "@/components/profile-menu";
import BottomNav from "@/components/bottom-nav";
import TabPager from "@/components/tab-pager";
import { ActiveSessionProvider } from "@/components/active-session-provider";
import StudyingBadge from "@/components/studying-badge";
import { ChildSelectionProvider } from "@/components/child-selection";
import TimerClient from "./timer/timer-client";
import LogClient from "./log/log-client";
import ChildrenList from "./children/children-list";
import ChildrenLogClient from "./children-log/children-log-client";

// Both tabs of an account type are rendered here, inside one TabPager, rather
// than as separate route pages. That's what lets the pages sit side by side
// and swipe as a whole, and it means switching tabs never re-fetches or shows
// a loading skeleton. The route pages (timer/, log/, children/, ...) now only
// enforce which role may open which URL on a hard load.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const isChild = profile.role === "child";

  let activeSession = null;
  let subjects = null;
  let requirePhotos = false;
  let tabs: React.ReactNode;

  if (isChild) {
    const [active, subjectList, photos, sessions] = await Promise.all([
      getActiveSession(),
      getSubjects(),
      getPhotoRequirement(),
      getSessions(),
    ]);
    activeSession = active;
    subjects = subjectList;
    requirePhotos = photos;

    tabs = (
      <TabPager
        paths={["/timer", "/log"]}
        refreshOnEnter={1}
        panels={[
          <section className="panel" key="timer">
            <div className="timer-stage">
              <TimerClient />
            </div>
          </section>,
          <section className="panel" key="log">
            <LogClient sessions={sessions} />
          </section>,
        ]}
      />
    );
  } else {
    const allLinks = await getLinkedChildren();
    const approved = allLinks.filter((c) => c.status === "approved");
    const initialChildId = approved[0]?.childId ?? null;
    const [initialSessions, recentSessions] = await Promise.all([
      initialChildId ? getChildSessions(initialChildId) : Promise.resolve([]),
      getRecentChildSessions(approved.map((c) => c.childId)),
    ]);
    // Remount when the set of linked children changes (add/remove), since
    // these clients seed their state from props once.
    const linksKey = allLinks.map((c) => c.linkId).join(",");

    tabs = (
      <ChildSelectionProvider>
      <TabPager
        paths={["/children", "/children-log"]}
        refreshOnEnter={0}
        panels={[
          <section className="panel" key="children">
            <div className="card children-card">
              <h2>Children</h2>
              <ChildrenList key={linksKey} initialChildren={allLinks} recentSessions={recentSessions} />
            </div>
          </section>,
          <section className="panel" key="children-log">
            <ChildrenLogClient
              key={linksKey}
              linkedChildren={approved}
              initialChildId={initialChildId}
              initialSessions={initialSessions}
            />
          </section>,
        ]}
      />
      </ChildSelectionProvider>
    );
  }

  return (
    <ActiveSessionProvider
      initialActiveSession={activeSession}
      initialSubjects={subjects}
      requirePhotos={requirePhotos}
      serverNow={Date.now()}
    >
      <div className="app-shell">
        <header className="top-bar">
          <div className="wordmark">
            <span className="khmer">Study Time</span>
          </div>
          <ProfileMenu displayName={profile.email || profile.displayName} role={profile.role} childCode={profile.childCode} />
        </header>

        <div className="krama-rule"></div>

        <main className="content">
          <StudyingBadge />
          {tabs}
          {children}
        </main>

        <BottomNav role={profile.role} />
      </div>
    </ActiveSessionProvider>
  );
}
