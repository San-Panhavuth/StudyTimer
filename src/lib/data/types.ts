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
};

export type BreakInterval = {
  start: number;
  end: number;
};

export type ActiveSession = {
  subjectId: string;
  subject: string;
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
};
