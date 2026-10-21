-- A session can cover more than one subject. The first subject stays in
-- subject_id/subject_name (charts group by it); any others added mid-session
-- are kept, in order, as display-only names.
alter table public.active_session
  add column extra_subjects text[] not null default '{}';

alter table public.sessions
  add column extra_subjects text[] not null default '{}';
