-- Tables created outside Supabase's normal provisioning flow don't automatically
-- pick up the default privileges the Data API (PostgREST) relies on. RLS still
-- gates row access on top of this — this only makes the tables reachable at all.
-- anon is intentionally left out: this app has no unauthenticated data access.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.subjects to authenticated;
grant select, insert, update, delete on public.sessions to authenticated;
grant select, insert, update, delete on public.active_session to authenticated;

grant all on public.profiles to service_role;
grant all on public.subjects to service_role;
grant all on public.sessions to service_role;
grant all on public.active_session to service_role;

-- Keep future tables in this schema consistent without a manual grant each time.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
