export type Subject = {
  id: string;
  name: string;
};

export type StudySession = {
  id: string;
  subjectId: string;
  subject: string;
  startTs: number;
  endTs: number;
  studySeconds: number;
  breakSeconds: number;
  // Other subjects covered in the same session, in order (display only).
  extraSubjects: string[];
  // Signed URLs (short-lived), newest upload last. Empty when none attached.
  images: string[];
};

export type BreakInterval = {
  start: number;
  end: number;
};

export type ActiveSession = {
  subjectId: string;
  subject: string;
  extraSubjects: string[];
  startTs: number;
  breakIntervals: BreakInterval[];
  breakStart: number | null;
  status: "running" | "break";
};

export type Role = "child" | "parent";

export type Profile = {
  email: string;
  displayName: string;
  role: Role;
  childCode: string | null;
};

export type LinkedChild = {
  linkId: string;
  childId: string;
  childEmail: string;
  childDisplayName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  requirePhotos: boolean;
};

// Just enough of a child's recent sessions for the parent's "studied today"
// summary. The client sums the ones that fall on its local calendar day.
export type RecentChildSession = {
  childId: string;
  subject: string;
  startTs: number;
  studySeconds: number;
};
