import { sql } from "drizzle-orm";
import { check, foreignKey, index, integer, jsonb, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";

// ---------------------------------------------------------------------------
// profiles
// ---------------------------------------------------------------------------
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    displayName: text("display_name").notNull().default("Guest"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.id], foreignColumns: [authUsers.id], name: "profiles_id_fk" }).onDelete("cascade"),
    pgPolicy("profiles_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.id}`,
    }),
    pgPolicy("profiles_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.id}`,
      withCheck: sql`${authUid} = ${table.id}`,
    }),
  ],
).enableRLS();

// ---------------------------------------------------------------------------
// subjects
// ---------------------------------------------------------------------------
export const subjects = pgTable(
  "subjects",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [authUsers.id], name: "subjects_user_id_fk" }).onDelete(
      "cascade",
    ),
    index("subjects_user_id_idx").on(table.userId),
    pgPolicy("subjects_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("subjects_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("subjects_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("subjects_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

// ---------------------------------------------------------------------------
// sessions (completed study sessions)
// ---------------------------------------------------------------------------
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    subjectId: uuid("subject_id").notNull(),
    subjectName: text("subject_name").notNull(),
    startTs: timestamp("start_ts", { withTimezone: true }).notNull(),
    endTs: timestamp("end_ts", { withTimezone: true }).notNull(),
    studySeconds: integer("study_seconds").notNull().default(0),
    breakSeconds: integer("break_seconds").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({ columns: [table.userId], foreignColumns: [authUsers.id], name: "sessions_user_id_fk" }).onDelete(
      "cascade",
    ),
    foreignKey({
      columns: [table.subjectId],
      foreignColumns: [subjects.id],
      name: "sessions_subject_id_fk",
    }).onDelete("cascade"),
    index("sessions_user_id_idx").on(table.userId),
    index("sessions_user_start_idx").on(table.userId, table.startTs.desc()),
    index("sessions_subject_id_idx").on(table.subjectId),
    check("sessions_study_seconds_nonneg", sql`${table.studySeconds} >= 0`),
    check("sessions_break_seconds_nonneg", sql`${table.breakSeconds} >= 0`),
    check("sessions_end_after_start", sql`${table.endTs} >= ${table.startTs}`),
    pgPolicy("sessions_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("sessions_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("sessions_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("sessions_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();

// ---------------------------------------------------------------------------
// active_session (at most one running/on-break timer per user)
// ---------------------------------------------------------------------------
export const activeSession = pgTable(
  "active_session",
  {
    userId: uuid("user_id").primaryKey(),
    subjectId: uuid("subject_id").notNull(),
    subjectName: text("subject_name").notNull(),
    startTs: timestamp("start_ts", { withTimezone: true }).notNull(),
    breakIntervals: jsonb("break_intervals").notNull().default(sql`'[]'::jsonb`),
    breakStart: timestamp("break_start", { withTimezone: true }),
    status: text("status").notNull().default("running"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [authUsers.id],
      name: "active_session_user_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.subjectId],
      foreignColumns: [subjects.id],
      name: "active_session_subject_id_fk",
    }).onDelete("cascade"),
    check("active_session_status_check", sql`${table.status} in ('running', 'break')`),
    pgPolicy("active_session_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("active_session_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("active_session_update_own", {
      for: "update",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
      withCheck: sql`${authUid} = ${table.userId}`,
    }),
    pgPolicy("active_session_delete_own", {
      for: "delete",
      to: authenticatedRole,
      using: sql`${authUid} = ${table.userId}`,
    }),
  ],
).enableRLS();
