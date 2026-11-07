-- Supabase grants these by default on everything created in `public`; RLS
-- then decides row access, and migrations REVOKE where needed. Run BEFORE
-- the migrations so those REVOKEs take effect, exactly as in Supabase.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
